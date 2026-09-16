import nodemailer from "nodemailer";
const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT||465), secure: (process.env.SMTP_SECURE??"true")!=="false", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
try { await t.verify(); console.log("✓ SMTP connection + auth OK (", process.env.SMTP_HOST, ":", process.env.SMTP_PORT, ")"); }
catch (e) { console.log("✗ SMTP failed:", e.message); }
