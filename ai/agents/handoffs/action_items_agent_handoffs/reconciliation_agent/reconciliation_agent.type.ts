import { z } from "zod";

/**
 * New action item to be created
 */
export const ReconciliationAddSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  owner: z.string().nullable(),
  dueDate: z.string().nullable(), // YYYY-MM-DD
  confidence: z.number().min(0),
  sourceStartTime: z.string().min(1),
  sourceEndTime: z.string().min(1),
});

/**
 * Existing action item update (PATCH)
 * ID is mandatory, everything else optional
 */
export const ReconciliationUpdateSchema = z.object({
  id: z.string().min(1), // DB ID (system-owned)
  externalId: z.string().min(1),
  title: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  owner: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(), // YYYY-MM-DD
  confidence: z.number().min(0).optional(),
});

/**
 * Final Action Items Agent Output
 */
export const ReconciliationsAgentOutputType = z.object({
  action_items: z.object({
    add: z.array(ReconciliationAddSchema),
    update: z.array(ReconciliationUpdateSchema),
  }),
  confidence: z.number().min(0),
  warnings: z.array(z.string()),
});

export type ReconciliationAdd = z.infer<typeof ReconciliationAddSchema>;
export type ReconciliationUpdate = z.infer<typeof ReconciliationUpdateSchema>;
export type ReconciliationsAgentOutputInterface = z.infer<
  typeof ReconciliationsAgentOutputType
>;
