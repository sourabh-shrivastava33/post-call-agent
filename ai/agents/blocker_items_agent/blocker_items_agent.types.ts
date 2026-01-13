import { z } from "zod";

export const BlockerSchema = z.object({
  blocker: z.string().min(5).max(300),
  reason: z.string().min(5).max(300),
  owner: z.string().min(1).max(100).nullable(),
  confidence: z.number().min(0).max(1),
  source: z.string().min(10),
  sourceStartTime: z.string().min(1),
  sourceEndTime: z.string().min(1),
});

export const BlockersAgentOutputSchema = z.object({
  blockers: z.array(BlockerSchema),
});

export type BlockersAgentOutput = z.infer<typeof BlockersAgentOutputSchema>;
export type Blocker = z.infer<typeof BlockerSchema>;
