// tools/send_followup_email.ts
import { tool, RunContext } from "@openai/agents";
import { z } from "zod";
import { logger } from "../../../../shared/logger";
import crypto from "crypto";
import nodemailer from "nodemailer";
import "dotenv/config";

export const sendFollowupEmail = tool({
  description: "Send a follow-up email to a client",
  strict: true,

  parameters: z.object({
    to: z.email().default("sourabhshrivastava@gmail.com"),
    subject: z.string().min(3),
    body: z.string().min(20),

    dry_run: z.boolean(),

    // Enforce non-empty meeting_id
    meeting_id: z.string().min(1),
  }),

  execute: async (
    { to, subject, body, dry_run, meeting_id },
    _runContext?: RunContext,
  ) => {
    try {
      const isDryRun = dry_run === true;

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
        return {
          status: "dry_run",
          to,
          subject,
          meeting_id,
        };
      }

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
  },
});
