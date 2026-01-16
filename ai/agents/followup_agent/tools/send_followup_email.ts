// tools/send_followup_email.ts
import { tool, RunContext } from "@openai/agents";
import { z } from "zod";
import { logger } from "../../../../shared/logger";
import crypto from "crypto";
import nodemailer from "nodemailer";
import "dotenv/config";

export const sendFollowupEmail = tool({
  description: "Send a follow-up email to a client (production hardened)",
  strict: true,

  // ✅ ALL FIELDS REQUIRED — OpenAI schema compliant
  parameters: z.object({
    to: z.string().email(),
    subject: z.string().min(3),
    body: z.string().min(20),

    // 👇 REQUIRED, even if usually false
    dry_run: z.boolean(),

    // 👇 REQUIRED (can be empty string if unavailable)
    meeting_id: z.string(),
  }),

  execute: async (
    { to, subject, body, dry_run, meeting_id },
    _runContext?: RunContext
  ) => {
    try {
      // 🧠 Enforce default behavior HERE, not in schema
      const isDryRun = dry_run === true;

      // 🔁 Idempotency hash
      const hash = crypto
        .createHash("sha256")
        .update(`${to}|${subject}|${body}`)
        .digest("hex");

      logger.log("📧 Follow-up email request", {
        to,
        subject,
        dry_run: isDryRun,
        meeting_id,
        hash,
      });

      if (isDryRun) {
        logger.log("🧪 DRY RUN — email not sent");
        return {
          status: "dry_run",
          to,
          subject,
          meeting_id,
        };
      }

      // 🔧 Build SMTP config from environment
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT
        ? parseInt(process.env.SMTP_PORT, 10)
        : undefined;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const from = process.env.FROM_EMAIL || smtpUser;

      if (!smtpHost || !smtpPort) {
        const msg = "SMTP configuration missing (SMTP_HOST/SMTP_PORT)";
        logger.error("❌ Email send failed - missing SMTP config", {
          error: msg,
          to,
          subject,
          meeting_id,
        });

        return {
          status: "failed",
          reason: msg,
          to,
          subject,
          meeting_id,
        };
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth:
          smtpUser && smtpPass
            ? {
                user: smtpUser,
                pass: smtpPass,
              }
            : undefined,
      });

      // Send email
      const mailOptions = {
        from: from || `no-reply@${smtpHost}`,
        to,
        subject,
        text: body,
        html: body,
      };

      const info: any = await transporter.sendMail(mailOptions);

      logger.log("📨 Email SENT", {
        to,
        subject,
        meeting_id,
        messageId: info.messageId,
        accepted: info.accepted,
        response: info.response,
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
  },
});
