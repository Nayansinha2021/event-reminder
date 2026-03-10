require('dotenv').config();
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Mock or Real configurations based on env
const isEmailMock = process.env.MOCK_NOTIFICATIONS === 'true' || !process.env.SMTP_USER || process.env.SMTP_USER === 'mock_user' || process.env.SMTP_USER === 'your_email@gmail.com';
const isSmsMock = process.env.MOCK_NOTIFICATIONS === 'true' || process.env.TWILIO_ACCOUNT_SID === 'mock_sid';

let twilioClient;
if (!isSmsMock && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Configure nodemailer for SMTP (e.g. Gmail App Passwords, SendGrid, etc.)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT) || 587,
    auth: {
        user: process.env.SMTP_USER || 'mock_user',
        pass: process.env.SMTP_PASS || 'mock_pass'
    }
});

const sendEmail = async (to, subject, text) => {
    if (isEmailMock) {
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body: ${text}`);
        return true;
    }

    try {
        // Here we would configure actual SendGrid / AWS SES transporter
        // e.g. using nodemailer-sendgrid-transport
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@event-reminder.com',
            to,
            subject,
            text
        });
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

const sendSMS = async (to, body) => {
    if (isSmsMock || !twilioClient) {
        console.log(`[MOCK SMS] To: ${to} | Body: ${body}`);
        return true;
    }

    try {
        await twilioClient.messages.create({
            body,
            from: process.env.TWILIO_PHONE_NUMBER,
            to
        });
        return true;
    } catch (error) {
        console.error('Error sending SMS:', error);
        return false;
    }
};

const sendPush = async (userId, title, body) => {
    // Requires Firebase Admin SDK configured with Google Service Account
    // Using API key passed previously if needed or Mock
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log(`[PUSH NOTIFICATION] User: ${userId} | Title: ${title} | Body: ${body} | Using Key: ${apiKey}`);
    return true;
};

module.exports = {
    sendEmail,
    sendSMS,
    sendPush
};
