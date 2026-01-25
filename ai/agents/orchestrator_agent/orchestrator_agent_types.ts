import { z } from "zod";

/**
 * Follow-up intent metadata extracted by the Orchestrator.
 * INTENT-LEVEL ONLY — no execution, no answers, no DB-derived data.
 */

/**
 * Orchestrator output schema with strict consistency guarantees.
 */
export const OrchestratorOutputType = z.object({
  call_action_items_agent: z.boolean(),
  call_blockers_agent: z.boolean(),

  decision_explanation: z.object({
    action_items: z.string().nullable(),
    blockers: z.string().nullable(),
  }),
});

export type OrchestratorDecisionSchema = z.infer<typeof OrchestratorOutputType>;
