import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  throw new Error('Missing required Twilio environment variables');
}

const client = twilio(accountSid, authToken);

/**
 * @param {string} phoneNumber
 * @returns {string}
 */
export const formatWhatsAppNumber = (phoneNumber) => {
  // Remove any non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  return `whatsapp:+${cleanNumber}`;
};

/**
 * @param {string} to
 * @param {string} message
 * @returns {Promise<void>}
 */
export const sendWhatsAppMessage = async (to, message) => {
  try {
    const formattedTo = formatWhatsAppNumber(to);
    const formattedFrom = formatWhatsAppNumber(fromNumber);
    
    // Add sandbox code to message
    const messageWithCode = `[Sandbox Code: ought-having]\n\n${message}`;
    
    await client.messages.create({
      body: messageWithCode,
      from: formattedFrom,
      to: formattedTo
    });
    
    console.log('WhatsApp message sent successfully');
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}; 