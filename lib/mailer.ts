import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    // Gmail app passwords: strip spaces (displayed with spaces but used without)
    pass: process.env.SMTP_PASS?.replace(/\s/g, ""),
  },
});
