import { z } from "zod";

/**
 * Blocker extracted from transcript (stateless, pre-reconciliation).
 * Mirrors Action Items extraction shape: title + summary.
 */
export const BlockerSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(5).max(500),
  owner: z.string().min(1).max(100).nullable(),
  confidence: z.number().min(0).max(1),
  source: z.string().min(10),
  sourceStartTime: z.string().min(1),
  sourceEndTime: z.string().min(1),
});

/**
 * Output schema for Blockers Extraction Agent
 * (always handed off to reconciliation).
 */
export const BlockersAgentOutputSchema = z.object({
  blockers: z.array(BlockerSchema),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

export type BlockersAgentOutput = z.infer<typeof BlockersAgentOutputSchema>;
export type Blocker = z.infer<typeof BlockerSchema>;
