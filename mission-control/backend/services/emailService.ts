import dotenv from "dotenv";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

dotenv.config();

const createTransporter = async () => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      type: "OAuth2",
      user: "admin@flomobility.co.in",
      serviceClient: process.env.GMAIL_SERVICE_CLIENT,
      privateKey: process.env.GMAIL_PRIVATE_KEY
    }
  } as SMTPTransport.Options);

  return transporter;
};

export const sendEmail = async (
  to: string | Mail.Address | (string | Mail.Address)[] | undefined,
  subject: string,
  text: string,
  cc?: string | Mail.Address | (string | Mail.Address)[] | undefined,
  html?: string
) => {
  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from: "admin@flomobility.co.in",
    to,
    subject,
    text,
    cc,
    html
  });
  return info;
};
