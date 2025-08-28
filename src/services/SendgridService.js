const sgMail = require("@sendgrid/mail");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
console.log("API KEY",process.env.SENDGRID_API_KEY)
const sendEmail = async ({ recipientEmail, subject, textContent, html }) => {
  try {
    const msg = {
      to: recipientEmail,
      from:  process.env.FROM_EMAIL, // Use FROM_EMAIL from .env or default to a specific email
      subject: subject,
      text: textContent,
      html: html,
    };
    
    await sgMail.send(msg);
  } catch (error) {
    console.error(
      "Error sending email:",
      error.response ? error.response.body : error.message
    );
    throw new Error(`Failed to send email , ${error.message}`);
  }
};

module.exports = { sendEmail };