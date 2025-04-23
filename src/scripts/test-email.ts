import EmailService from '../lib/emailService';

async function testEmail() {
  try {
    const emailService = new EmailService();
    
    // Test email configuration
    const testResult = await emailService.verifyConnection();
    if (!testResult) {
      console.error('Failed to verify email connection');
      return;
    }
    
    // Send test email
    await emailService.sendEmail({
      to: process.env.RECIPIENT_EMAIL || 'jakobwiley@gmail.com',
      subject: 'Test Email from AI-BET',
      body: 'This is a test email to verify the email service is working correctly.'
    });
    
    console.log('Test email sent successfully');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error sending test email:', error.message);
    } else {
      console.error('Unknown error occurred while sending test email');
    }
  }
}

testEmail();