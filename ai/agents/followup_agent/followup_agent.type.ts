// followup_agent.types.ts
import { z } from "zod";

/**
 * Execution result of sending a follow-up email
 * This mirrors the sendFollowupEmail tool response shape.
 */
export const FollowUpSendResult = z.object({
  status: z.enum(["sent", "dry_run", "failed"]),
  to: z.string().email(),
  subject: z.string().min(3),
  meeting_id: z.string().min(1),

  // Present only on success
  messageId: z.string().optional(),
  accepted: z.array(z.string()).optional(),

  // Present only on failure
  reason: z.string().optional(),
});

/**
 * Final output of FollowUpAgent
 * Represents what actually happened, not what was planned.
 */
export const FollowUpAgentOutputType = z.object({
  email: FollowUpSendResult,
  warnings: z.array(z.string()).default([]),
});

export type FollowUpAgentOutput = z.infer<typeof FollowUpAgentOutputType>;

/**
 * Init params remain unchanged
 * These are inputs used to compose the email
 */
export type FollowupAgentInitParams = {
  transcriptString?: string;
  actionItems?: any;
  blockers?: any;
};
