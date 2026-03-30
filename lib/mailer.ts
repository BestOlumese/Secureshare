import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // Assuming this is smtp.gmail.com
  port: 587,                   // Switch to 587 to bypass the block
  secure: false,               // MUST be false for 587 (it will auto-upgrade via STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Reminder: This MUST be a Google App Password, not your regular password!
  },
  tls: {
    rejectUnauthorized: false, // Fine for development, but remove or set to true for production
  },
  logger: true,
  debug: true,
});