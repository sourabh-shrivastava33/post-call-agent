import { z } from "zod";

/**
 * New action item to be created
 */
export const ActionItem = z.object({
  summary: z.string().min(1),
  owner: z.string().nullable(),
  dueDate: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  source: z.string().min(1),
});

/**
 * Final Action Items Agent Output
 */
export const ActionItemsAgentOutputType = z.object({
  action_items: z.array(ActionItem),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

export type ActionItemAdd = z.infer<typeof ActionItem>;
export type ActionItemsAgentOutput = z.infer<typeof ActionItemsAgentOutputType>;
