import { z } from "zod";

/**
 * New action item to be created
 */
export const ReconciliationAddSchema = z.object({
  summary: z.string().min(1),
  owner: z.string().nullable(),
  dueDate: z.string().nullable(), // YYYY-MM-DD
  confidence: z.number().min(0).max(1),
  source: z.string().min(1),
  sourceStartTime: z.string().min(1),
  sourceEndTime: z.string().min(1),
});

/**
 * Existing action item update (PATCH)
 * ID is mandatory, everything else optional
 */
export const ReconciliationUpdateSchema = z.object({
  id: z.string().min(1), // DB ID (system-owned)
  updated_summary: z.string().min(1).optional(),
  updated_owner: z.string().nullable().optional(),
  updated_dueDate: z.string().nullable().optional(), // YYYY-MM-DD
  updated_confidence: z.number().min(0).max(1).optional(),
  source: z.string().min(1),
});

/**
 * Final Action Items Agent Output
 */
export const ReconciliationsAgentOutputType = z.object({
  action_items: z.object({
    add: z.array(ReconciliationAddSchema),
    update: z.array(ReconciliationUpdateSchema),
  }),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

export type ReconciliationAdd = z.infer<typeof ReconciliationAddSchema>;
export type ReconciliationUpdate = z.infer<typeof ReconciliationUpdateSchema>;
export type ReconciliationsAgentOutputInterface = z.infer<
  typeof ReconciliationsAgentOutputType
>;
