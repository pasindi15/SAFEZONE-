const nodemailer = require("nodemailer");

// accept both SMTP and email env
const env = (k, alt) => process.env[k] ?? process.env[alt];

const SMTP_HOST   = env("SMTP_HOST",   "EMAIL_HOST");
const SMTP_PORT   = env("SMTP_PORT",   "EMAIL_PORT");
const SMTP_SECURE = env("SMTP_SECURE", "EMAIL_SECURE");
const SMTP_USER   = env("SMTP_USER",   "EMAIL_USER");
const SMTP_PASS   = env("SMTP_PASS",   "EMAIL_PASS");
const SMTP_FROM   = env("SMTP_FROM",   "EMAIL_FROM");

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: String(SMTP_SECURE || "false").toLowerCase() === "true", // true for 465
  auth: (SMTP_USER && SMTP_PASS) ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  pool: true, 
});

async function verify() {
  try {
    await transporter.verify();
    console.log(`[mailer] ✅ SMTP ready: ${SMTP_HOST}:${SMTP_PORT}`);
  } catch (err) {
    console.warn("[mailer] ⚠️ SMTP verify failed:", err.message);
  }
}

//send mail
async function sendEmail(a, b, c) {
  let to, subject, html, text, cc, bcc, attachments;

  if (typeof a === "object" && a !== null) {
    ({ to, subject, html, text, cc, bcc, attachments } = a);
  } else {
    to = a; subject = b; html = c;
  }

  if (!to || !subject) throw new Error("sendEmail requires 'to' and 'subject'");

  const from = SMTP_FROM || SMTP_USER;
  const safeHtml = (typeof html === "string" && html.trim())
    ? html
    : `<p>${text || "SafeZone alert notification."}</p>`;
  const safeText = text || safeHtml.replace(/<[^>]+>/g, " ");

  try {
    const info = await transporter.sendMail({
      from, to, cc, bcc, subject,
      html: safeHtml,
      text: safeText,
      attachments,
    });
    console.log("[mailer] sent", {
      to,
      messageId: info?.messageId,
      accepted: info?.accepted,
      rejected: info?.rejected
    });
    return info;
  } catch (err) {
    console.error("[mailer] sendEmail error:", err.message);
    throw err;
  }
}

module.exports = { verify, sendEmail, transporter };
