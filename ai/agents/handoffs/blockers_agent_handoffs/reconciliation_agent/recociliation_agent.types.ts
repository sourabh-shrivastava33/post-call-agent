import { z } from "zod";

/**
 * New blocker to be created (ADD)
 * Title is stable, summary is descriptive.
 */
export const BlockerAddSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  owner: z.string().nullable(),
  dueDate: z.string().nullable(), // YYYY-MM-DD
  confidence: z.number().min(0),
  sourceStartTime: z.string().min(1),
  sourceEndTime: z.string().min(1),
});

/**
 * Existing blocker update (MERGE / PATCH)
 * ID is mandatory.
 * Title MUST NOT be updated.
 * Summary is append-only at reconciliation time.
 */
export const BlockerUpdateSchema = z.object({
  id: z.string().min(1), // DB ID (system-owned)
  externalId: z.string().min(1),
  summary: z.string().min(1).optional(),
  owner: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(), // YYYY-MM-DD
  confidence: z.number().min(0).optional(),
});

/**
 * Final Blockers Reconciliation Agent Output
 */
export const BlockersReconciliationOutputSchema = z.object({
  blockers: z.object({
    add: z.array(BlockerAddSchema),
    update: z.array(BlockerUpdateSchema),
  }),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

export type BlockerAdd = z.infer<typeof BlockerAddSchema>;
export type BlockerUpdate = z.infer<typeof BlockerUpdateSchema>;
export type BlockersReconciliationOutput = z.infer<
  typeof BlockersReconciliationOutputSchema
>;
