import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { PrismaClient } from '@prisma/client';
import { aiService } from './aiService';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';


const prisma = new PrismaClient();

export class EmailParserService {
  private imap: Imap;

  constructor() {
    this.imap = new Imap({
      user: process.env.IMAP_USER!,
      password: process.env.IMAP_PASSWORD!,
      host: process.env.IMAP_HOST!,
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });
  }

  /**
   * Poll inbox for new emails and process vendor responses
   */
  async pollInbox(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => {
        this.imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            reject(err);
            return;
          }

          // Search for unread emails
          this.imap.search(['UNSEEN'], async (err, results) => {
            if (err) {
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              console.log('No new emails found');
              this.imap.end();
              resolve();
              return;
            }

            console.log(`Found ${results.length} new email(s)`);

            const fetch = this.imap.fetch(results, { bodies: '', struct: true });

            fetch.on('message', async (msg, seqno) => {
              try {
                await this.processMessage(msg);
              } catch (error) {
                console.error(`Error processing message ${seqno}:`, error);
              }
            });

            fetch.once('end', () => {
              this.imap.end();
              resolve();
            });
          });
        });
      });

      this.imap.once('error', (err) => {
        reject(err);
      });

      this.imap.connect();
    });
  }

  /**
   * Process a single email message
   */
  private async processMessage(msg: any): Promise<void> {
    return new Promise((resolve, reject) => {
      let emailData: any = {};

      msg.on('body', (stream: any) => {
        simpleParser(stream, async (err, parsed) => {
          if (err) {
            reject(err);
            return;
          }

          emailData = {
            subject: parsed.subject || '',
            from: parsed.from?.text || '',
            text: parsed.text || '',
            html: parsed.html || '',
            attachments: parsed.attachments || [],
          };

          // Extract RFP ID from subject (format: "RFP: Title - 123" or "Re: RFP: Title - 123")
          const rfpIdMatch = emailData.subject.match(/RFP.*?-\s*(\d+)/i);
          const rfpId = rfpIdMatch ? parseInt(rfpIdMatch[1]) : null;

          if (!rfpId) {
            console.log(`Could not extract RFP ID from subject: ${emailData.subject}`);
            resolve();
            return;
          }

          try {
            await this.processVendorResponse(rfpId, emailData);
          } catch (error) {
            console.error('Error processing vendor response:', error);
          }

          resolve();
        });
      });

      msg.once('end', () => {
        // Message processing complete
      });
    });
  }

  /**
   * Process vendor response and extract proposal data
   */
  private async processVendorResponse(rfpId: number, emailData: any): Promise<void> {
    // Find vendor by email
    const vendor = await prisma.vendor.findFirst({
      where: {
        email: {
          contains: emailData.from,
          mode: 'insensitive',
        },
      },
    });

    if (!vendor) {
      console.log(`Vendor not found for email: ${emailData.from}`);
      return;
    }

    // Get RFP details
    const rfp = await prisma.rFP.findUnique({
      where: { id: rfpId },
    });

    if (!rfp) {
      console.log(`RFP not found: ${rfpId}`);
      return;
    }

    // Process attachments
    const attachmentContents: Array<{ filename: string; content: string }> = [];
    
    for (const attachment of emailData.attachments) {
      try {
        const content = await this.extractAttachmentContent(attachment);
        if (content) {
          attachmentContents.push({
            filename: attachment.filename || 'unknown',
            content,
          });
        }
      } catch (error) {
        console.error(`Error processing attachment ${attachment.filename}:`, error);
      }
    }

    // Use AI to parse the response
    const parsedData = await aiService.parseProposalResponse(
      emailData.text || emailData.html || '',
      attachmentContents.length > 0 ? attachmentContents : undefined,
      rfp.requirements
    );

    // Calculate completeness score (simple heuristic)
    const completeness = this.calculateCompleteness(parsedData, rfp);

    // Generate AI summary
    const summary = parsedData.summary || 'Proposal received and parsed';

    // Update or create proposal
    await prisma.proposal.update({
      where: {
        rfpId_vendorId: {
          rfpId,
          vendorId: vendor.id,
        },
      },
      data: {
        emailSubject: emailData.subject,
        emailBody: emailData.html || emailData.text,
        rawContent: emailData.text || emailData.html || '',
        parsedData: parsedData as any,
        totalPrice: parsedData.totalPrice || null,
        currency: parsedData.currency || 'USD',
        deliveryDate: parsedData.deliveryDate ? new Date(parsedData.deliveryDate) : null,
        paymentTerms: parsedData.paymentTerms || null,
        warranty: parsedData.warranty || null,
        lineItems: parsedData.lineItems || null,
        terms: parsedData.terms || null,
        aiSummary: summary,
        completeness: completeness,
      },
    });

    console.log(`Processed proposal from ${vendor.name} for RFP ${rfpId}`);
  }

  /**
   * Extract text content from attachment
   */
  private async extractAttachmentContent(attachment: any): Promise<string | null> {
    const contentType = attachment.contentType || '';
    const buffer = attachment.content;

    if (!buffer) {
      return null;
    }

    try {
      if (contentType.includes('pdf')) {
        const pdfData = await pdfParse(buffer);
        return pdfData.text;
      } else if (contentType.includes('word') || contentType.includes('msword') || attachment.filename?.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } else if (contentType.includes('text')) {
        return buffer.toString('utf-8');
      } else {
        console.log(`Unsupported attachment type: ${contentType}`);
        return null;
      }
    } catch (error) {
      console.error(`Error extracting attachment content:`, error);
      return null;
    }
  }

  /**
   * Calculate completeness score based on how well proposal addresses RFP requirements
   */
  private calculateCompleteness(parsedData: any, rfp: any): number {
    let score = 0;
    let maxScore = 0;

    // Price (20 points)
    maxScore += 20;
    if (parsedData.totalPrice) score += 20;
    else if (parsedData.lineItems && parsedData.lineItems.length > 0) score += 10;

    // Delivery date (20 points)
    maxScore += 20;
    if (parsedData.deliveryDate) score += 20;

    // Payment terms (15 points)
    maxScore += 15;
    if (parsedData.paymentTerms) score += 15;

    // Warranty (15 points)
    maxScore += 15;
    if (parsedData.warranty) score += 15;

    // Line items match requirements (30 points)
    maxScore += 30;
    const rfpRequirements = Array.isArray(rfp.requirements) ? rfp.requirements : [];
    const proposalItems = Array.isArray(parsedData.lineItems) ? parsedData.lineItems : [];
    
    if (rfpRequirements.length > 0) {
      const matchedItems = rfpRequirements.filter((req: any) =>
        proposalItems.some((item: any) =>
          item.item?.toLowerCase().includes(req.item?.toLowerCase() || '')
        )
      );
      score += (matchedItems.length / rfpRequirements.length) * 30;
    } else {
      score += 30; // No specific requirements, give full points
    }

    return Math.round((score / maxScore) * 100);
  }
}

