"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
// src/config/mail.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // 👈 여기서 .env 로드
const nodemailer_1 = __importDefault(require("nodemailer"));
if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error("⚠ GMAIL_USER 또는 GMAIL_PASS 환경변수가 설정되지 않았습니다.");
}
const transporter = nodemailer_1.default.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});
async function sendMail(options) {
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
