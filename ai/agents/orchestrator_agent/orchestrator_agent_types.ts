import { z } from "zod";

export const OrchestratorOutputType = z.object({
  call_action_items_agent: z.boolean(),
  call_blockers_agent: z.boolean(),
  call_summary_agent: z.boolean(), // enforces const: true
  decision_explanation: z.object({
    action_items: z.string().nullable(),
    blockers: z.string().nullable(),
    summary: z.string(),
  }),
});

export type OrchestratorDecisionSchema = z.infer<typeof OrchestratorOutputType>;
