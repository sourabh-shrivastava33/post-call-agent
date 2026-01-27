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

    // Enforce non-empty meeting_id
    meeting_id: z.string().min(1),
  }),
  needsApproval: async () => true,
  execute: async (
    { to, subject, body, meeting_id },
    _runContext?: RunContext,
  ) => {
    throw new Error("This tool should never run");
  },
});
