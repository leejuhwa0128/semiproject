// src/config/mail.ts
import dotenv from "dotenv";
dotenv.config(); // 👈 여기서 .env 로드

import nodemailer from "nodemailer";

if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
  console.error("⚠ GMAIL_USER 또는 GMAIL_PASS 환경변수가 설정되지 않았습니다.");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function sendMail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const { to, subject, text, html } = options;

  const info = await transporter.sendMail({
    from: `"세미 프로젝트" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });

  console.log("메일 발송 완료:", info.messageId);
}
