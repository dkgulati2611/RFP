import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { Prisma, PrismaClient } from '@prisma/client';
import { aiService } from './aiService';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import crypto from 'crypto';


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
   * Get the earliest RFP creation date or use configured start date
   */
  private async getStartDate(): Promise<Date> {
    // Check for configured start date
    const configuredDate = process.env.EMAIL_POLL_START_DATE;
    if (configuredDate) {
      const date = new Date(configuredDate);
      if (!isNaN(date.getTime())) {
        console.log(`Using configured start date: ${date.toISOString()}`);
        return date;
      }
    }

    // Default to 7 days ago if no RFPs exist
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() - 7);
    console.log(`No RFPs found, using default start date (7 days ago): ${defaultDate.toISOString()}`);
    return defaultDate;
  }

  /**
   * Poll inbox for new emails and process vendor responses
   */
  async pollInbox(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.once('ready', async () => {
        try {
          const startDate = await this.getStartDate();
          
            this.imap.openBox('INBOX', false, (err: Error | null, box: any) => {
              if (err) {
                reject(err);
                return;
              }

            // Format date for IMAP search (format: DD-MMM-YYYY)
            const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const [year, month, day] = dateStr.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const imapDate = `${day}-${monthNames[parseInt(month) - 1]}-${year}`;

            // Search for unread emails after the start date
            // Using SINCE to get emails on or after the start date
            const searchCriteria = ['UNSEEN', ['SINCE', imapDate]];

            this.imap.search(searchCriteria, async (err, results) => {
              if (err) {
                reject(err);
                return;
              }

              if (!results || results.length === 0) {
                console.log(`No new emails found after ${imapDate}`);
                this.imap.end();
                resolve();
                return;
              }

              console.log(`Found ${results.length} new email(s) after ${imapDate}`);

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
        } catch (error) {
          reject(error);
        }
      });

      this.imap.once('error', (err: Error) => {
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
            from: parsed.from?.value?.[0]?.address || '',
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
    console.log(`Processing vendor response for RFP ${rfpId} from ${emailData.from}`);
    // Find vendor by email
    const vendor = await prisma.vendor.findFirst({
      where: {
        email: {
          contains: emailData.from,
          mode: 'insensitive',
        },
      },
    });
    console.log(`Vendor found: ${vendor?.name}`);

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
    
    console.log(`Processing ${emailData.attachments.length} attachment(s) for vendor response`);
    
    for (const attachment of emailData.attachments) {
      try {
        const filename = attachment.filename || 'unknown';
        console.log(`Processing attachment: ${filename} (${attachment.contentType || 'unknown type'})`);
        
        const content = await this.extractAttachmentContent(attachment);
        if (content && content.trim().length > 0) {
          attachmentContents.push({
            filename,
            content: content.trim(),
          });
          console.log(`Successfully extracted ${content.length} characters from ${filename}`);
        } else {
          console.log(`No content extracted from ${filename}`);
        }
      } catch (error) {
        console.error(`Error processing attachment ${attachment.filename}:`, error);
      }
    }

    // Check if we already have parsed data for this proposal (avoid re-parsing)
    const existingProposal = await prisma.proposal.findUnique({
      where: {
        rfpId_vendorId: {
          rfpId,
          vendorId: vendor.id,
        },
      },
      select: {
        parsedData: true,
        rawContent: true,
        emailBody: true,
      },
    });

    // Only re-parse if content has changed or if we don't have parsed data
    const currentContent = emailData.text || emailData.html || '';
    const currentContentHash = this.hashContent(currentContent + JSON.stringify(attachmentContents));
    const existingContentHash = existingProposal?.rawContent 
      ? this.hashContent(existingProposal.rawContent)
      : null;

    let parsedData;
    if (existingProposal?.parsedData && currentContentHash === existingContentHash) {
      console.log(`Using cached parsed data for proposal from ${vendor.name}`);
      parsedData = existingProposal.parsedData as any;
    } else {
      console.log(`Parsing new vendor response from ${vendor.name}`);
      // Use AI to parse the response
      parsedData = await aiService.parseProposalResponse(
        currentContent,
        attachmentContents.length > 0 ? attachmentContents : undefined,
        rfp.requirements
      );
    }

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
        lineItems: parsedData.lineItems ? parsedData.lineItems as any : null,
        terms: parsedData.terms ? parsedData.terms as any : null,
        aiSummary: summary,
        completeness: completeness,
      },
    });

    // Invalidate cached comparison for this RFP since we have a new/updated proposal
    await prisma.rFP.update({
      where: { id: rfpId },
      data: {
        aiComparisonResult: Prisma.JsonNull,
        aiComparisonUpdatedAt: null,
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
    const filename = attachment.filename || '';

    if (!buffer) {
      console.log(`No buffer found for attachment: ${filename}`);
      return null;
    }

    try {
      // Handle PDF files
      if (contentType.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) {
        console.log(`Extracting text from PDF: ${filename}`);
        const pdfData = await pdfParse(buffer);
        const extractedText = pdfData.text;
        console.log(`Extracted ${extractedText.length} characters from PDF`);
        return extractedText;
      } 
      // Handle Word documents
      else if (
        contentType.includes('word') || 
        contentType.includes('msword') || 
        contentType.includes('officedocument') ||
        filename.toLowerCase().endsWith('.docx') ||
        filename.toLowerCase().endsWith('.doc')
      ) {
        console.log(`Extracting text from Word document: ${filename}`);
        const result = await mammoth.extractRawText({ buffer });
        console.log(`Extracted ${result.value.length} characters from Word document`);
        return result.value;
      } 
      // Handle text files
      else if (contentType.includes('text') || filename.toLowerCase().endsWith('.txt')) {
        console.log(`Extracting text from text file: ${filename}`);
        const text = buffer.toString('utf-8');
        return text;
      } 
      // Handle CSV files
      else if (contentType.includes('csv') || filename.toLowerCase().endsWith('.csv')) {
        console.log(`Extracting text from CSV: ${filename}`);
        const text = buffer.toString('utf-8');
        return text;
      }
      // Handle Excel files (basic text extraction)
      else if (
        contentType.includes('spreadsheet') ||
        filename.toLowerCase().endsWith('.xlsx') ||
        filename.toLowerCase().endsWith('.xls')
      ) {
        console.log(`Attempting to extract text from Excel file: ${filename}`);
        // For Excel, we'll try to extract as text (basic approach)
        // For better Excel parsing, you might want to add a library like 'xlsx'
        const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000)); // Limit to first 10KB
        return text.length > 0 ? text : null;
      }
      else {
        console.log(`Unsupported attachment type: ${contentType} for file: ${filename}`);
        return null;
      }
    } catch (error) {
      console.error(`Error extracting attachment content from ${filename}:`, error);
      return null;
    }
  }

  /**
   * Generate a hash of content for comparison
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
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

