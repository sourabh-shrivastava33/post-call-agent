import { z } from "zod";

/**
 * Single action item schema
 */
export const ActionItemSchema = z.object({
  title: z.string().min(1),
  owner: z.string().nullable(),
  deadline: z.string().nullable(), // ISO Date: YYYY-MM-DD
  confidence: z.number().min(0).max(1),
  source: z.string().min(1),
});

/**
 * Agent output schema
 */
export const ActionItemsAgentOutputType = z.object({
  action_items: z.array(ActionItemSchema),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;
export type ActionItemsAgentOutput = z.infer<typeof ActionItemsAgentOutputType>;
