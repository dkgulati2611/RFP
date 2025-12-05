import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  /**
   * Send RFP to vendors via email
   */
  async sendRFPToVendors(rfpId: number, vendorIds: number[]): Promise<string[]> {
    const rfp = await prisma.rFP.findUnique({
      where: { id: rfpId },
    });

    if (!rfp) {
      throw new Error('RFP not found');
    }

    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
    });

    if (vendors.length === 0) {
      throw new Error('No vendors found');
    }

    const sentEmails: string[] = [];

    for (const vendor of vendors) {
      try {
        const emailHtml = this.generateRFPEmail(rfp);
        const replyTo = process.env.EMAIL_REPLY_TO || process.env.SMTP_FROM || '';

        await this.transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: vendor.email,
          replyTo: replyTo,
          subject: `RFP: ${rfp.title} - ${rfp.id}`,
          html: emailHtml,
          text: this.generateRFPEmailText(rfp),
        });

        // Create proposal record
        await prisma.proposal.upsert({
          where: {
            rfpId_vendorId: {
              rfpId: rfp.id,
              vendorId: vendor.id,
            },
          },
          update: {
            emailSubject: `RFP: ${rfp.title} - ${rfp.id}`,
          },
          create: {
            rfpId: rfp.id,
            vendorId: vendor.id,
            emailSubject: `RFP: ${rfp.title} - ${rfp.id}`,
          },
        });

        sentEmails.push(vendor.email);
      } catch (error) {
        console.error(`Failed to send email to ${vendor.email}:`, error);
        // Continue with other vendors even if one fails
      }
    }

    // Update RFP status
    await prisma.rFP.update({
      where: { id: rfpId },
      data: { status: 'sent' },
    });

    return sentEmails;
  }

  /**
   * Generate HTML email content for RFP
   */
  private generateRFPEmail(rfp: any): string {
    const requirements = Array.isArray(rfp.requirements) ? rfp.requirements : [];
    const deadline = rfp.deadline ? new Date(rfp.deadline).toLocaleDateString() : 'Not specified';
    const budget = rfp.budget ? `$${rfp.budget.toLocaleString()}` : 'Not specified';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; color: #4CAF50; margin-bottom: 10px; }
          .requirement-item { margin-left: 20px; margin-bottom: 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Request for Proposal (RFP)</h1>
            <p>RFP ID: ${rfp.id}</p>
          </div>
          <div class="content">
            <div class="section">
              <div class="section-title">Title:</div>
              <div>${rfp.title}</div>
            </div>
            
            <div class="section">
              <div class="section-title">Description:</div>
              <div>${rfp.description}</div>
            </div>
            
            <div class="section">
              <div class="section-title">Budget:</div>
              <div>${budget}</div>
            </div>
            
            <div class="section">
              <div class="section-title">Deadline:</div>
              <div>${deadline}</div>
            </div>
            
            ${requirements.length > 0 ? `
            <div class="section">
              <div class="section-title">Requirements:</div>
              ${requirements.map((req: any) => `
                <div class="requirement-item">
                  <strong>${req.item}</strong>
                  ${req.quantity ? ` (Quantity: ${req.quantity})` : ''}
                  ${req.specifications ? `<br>Specifications: ${JSON.stringify(req.specifications)}` : ''}
                </div>
              `).join('')}
            </div>
            ` : ''}
            
            ${rfp.paymentTerms ? `
            <div class="section">
              <div class="section-title">Payment Terms:</div>
              <div>${rfp.paymentTerms}</div>
            </div>
            ` : ''}
            
            ${rfp.warrantyReq ? `
            <div class="section">
              <div class="section-title">Warranty Requirements:</div>
              <div>${rfp.warrantyReq}</div>
            </div>
            ` : ''}
            
            ${rfp.deliveryTerms ? `
            <div class="section">
              <div class="section-title">Delivery Terms:</div>
              <div>${rfp.deliveryTerms}</div>
            </div>
            ` : ''}
            
            <div class="section">
              <div class="section-title">Instructions:</div>
              <div>Please reply to this email with your proposal, including pricing, delivery timeline, and any relevant terms and conditions. You may attach supporting documents if needed.</div>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated RFP. Please reply directly to this email with your proposal.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text version of RFP email
   */
  private generateRFPEmailText(rfp: any): string {
    const requirements = Array.isArray(rfp.requirements) ? rfp.requirements : [];
    const deadline = rfp.deadline ? new Date(rfp.deadline).toLocaleDateString() : 'Not specified';
    const budget = rfp.budget ? `$${rfp.budget.toLocaleString()}` : 'Not specified';

    let text = `REQUEST FOR PROPOSAL (RFP)\n`;
    text += `RFP ID: ${rfp.id}\n\n`;
    text += `Title: ${rfp.title}\n\n`;
    text += `Description:\n${rfp.description}\n\n`;
    text += `Budget: ${budget}\n`;
    text += `Deadline: ${deadline}\n\n`;

    if (requirements.length > 0) {
      text += `Requirements:\n`;
      requirements.forEach((req: any) => {
        text += `- ${req.item}`;
        if (req.quantity) text += ` (Quantity: ${req.quantity})`;
        if (req.specifications) text += ` - ${JSON.stringify(req.specifications)}`;
        text += `\n`;
      });
      text += `\n`;
    }

    if (rfp.paymentTerms) text += `Payment Terms: ${rfp.paymentTerms}\n`;
    if (rfp.warrantyReq) text += `Warranty Requirements: ${rfp.warrantyReq}\n`;
    if (rfp.deliveryTerms) text += `Delivery Terms: ${rfp.deliveryTerms}\n`;

    text += `\nPlease reply to this email with your proposal, including pricing, delivery timeline, and any relevant terms and conditions.`;

    return text;
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection verification failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();

