import { logger } from "../../shared/logger";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function sendFollowupEmail({
  to,
  subject,
  body,
  meeting_id,
}: {
  to: string;
  subject: string;
  body: string;
  meeting_id: string;
}) {
  try {
    const hash = crypto
      .createHash("sha256")
      .update(`${to}|${subject}|${body}`)
      .digest("hex");

    logger.log("📧 Follow-up email request", {
      to,
      subject,
      meeting_id,
      hash,
    });

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT
      ? parseInt(process.env.SMTP_PORT, 10)
      : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const from = process.env.FROM_EMAIL || smtpUser;

    if (!smtpHost || !smtpPort) {
      return {
        status: "failed",
        reason: "SMTP configuration missing",
        to,
        subject,
        meeting_id,
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth:
        smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    const info: any = await transporter.sendMail({
      from: from || `no-reply@${smtpHost}`,
      to,
      subject,
      text: body, // plain text only
    });

    return {
      status: "sent",
      to,
      subject,
      meeting_id,
      messageId: info.messageId,
      accepted: info.accepted,
    };
  } catch (err: any) {
    logger.error("❌ Email send failed", {
      error: err.message,
      to,
      subject,
      meeting_id,
    });

    return {
      status: "failed",
      reason: err.message,
      to,
      subject,
      meeting_id,
    };
  }
}
