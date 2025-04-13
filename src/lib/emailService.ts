import nodemailer from 'nodemailer';
import { format } from 'date-fns';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject?: string;
  body: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultConfig: EmailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || ''
    }
  };

  constructor(config?: Partial<EmailConfig>) {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Validate required credentials
    if (!finalConfig.auth.user || !finalConfig.auth.pass) {
      throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.');
    }

    this.transporter = nodemailer.createTransport(finalConfig);
  }

  async sendEmail({ to, subject, body }: EmailOptions): Promise<void> {
    try {
      // Validate recipient
      if (!to || to.trim() === '') {
        throw new Error('No recipient email address provided');
      }

      // Use default subject if none provided
      const emailSubject = subject || `AI-BET Predictions for ${format(new Date(), 'MMM d, yyyy')}`;

      console.log(`Sending email to ${to} with subject "${emailSubject}"`);
      console.log(`Email body length: ${body.length} characters`);

      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: emailSubject,
        text: body,
      });

      console.log(`Email sent successfully to ${to}. Message ID: ${result.messageId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Failed to send email: ${errorMessage}`);
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Failed to verify email connection: ${errorMessage}`);
      return false;
    }
  }
}

export default EmailService; 