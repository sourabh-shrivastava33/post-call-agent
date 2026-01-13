import { z } from "zod";

export const BlockerAddSchema = z.object({
  blocker: z.string(),
  reason: z.string(),
  owner: z.string().nullable(),
  confidence: z.number(),
  source: z.string(),
  sourceStartTime: z.string().min(1),
  sourceEndTime: z.string().min(1),
});

export const BlockerUpdateSchema = z.object({
  id: z.string(),
  updated_reason: z.string().optional(),
  updated_owner: z.string().nullable().optional(),
  updated_confidence: z.number().optional(),
  source: z.string(),
});

export const BlockersReconciliationOutputSchema = z.object({
  blockers: z.object({
    add: z.array(BlockerAddSchema),
    update: z.array(BlockerUpdateSchema),
  }),
  confidence: z.number(),
  warnings: z.array(z.string()),
});

export type BlockerAdd = z.infer<typeof BlockerAddSchema>;
export type BlockerUpdate = z.infer<typeof BlockerUpdateSchema>;
export type BlockersReconciliationOutput = z.infer<
  typeof BlockersReconciliationOutputSchema
>;
