// followup_agent.types.ts
import { z } from "zod";
import { FollowUpIntentInterface } from "../orchestrator_agent/orchestrator_agent_types";
import {
  ExtendedActionItemsType,
  ExtendedBlockersType,
} from "../../followup_orchestrate/followup_orchestrate.types";

export const FollowUpEmail = z.object({
  to: z.string().email(),
  subject: z.string().min(3),
  body: z.string().min(20),
  confidence: z.number().min(0).max(1),
  source: z.string(),
});

export const FollowUpAgentOutputType = z.object({
  emails: z.array(FollowUpEmail),
  warnings: z.array(z.string()),
});

export type FollowUpAgentOutput = z.infer<typeof FollowUpAgentOutputType>;
export type FollowupAgentInitParams = {
  followupIntent?: FollowUpIntentInterface;
  actionItems?: ExtendedActionItemsType;
  blockers?: ExtendedBlockersType;
};
