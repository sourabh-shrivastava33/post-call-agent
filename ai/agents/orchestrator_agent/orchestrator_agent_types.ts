import { z } from "zod";

/**
 * Follow-up intent metadata extracted by the Orchestrator.
 * INTENT-LEVEL ONLY — no execution, no answers, no DB-derived data.
 */
export const FollowupIntentSchema = z.object({
  reason: z.enum(["explicit_commitment", "client_question", "recap_request"]),

  recipient: z.literal("client"),

  urgency: z.enum(["immediate", "same_day", "later"]),

  requiresReconciledData: z.boolean(),

  confidence: z.number().min(0).max(1),

  queryContext: z
    .object({
      type: z.enum(["information_request", "clarification", "confirmation"]),
      topic: z.string().min(1),
      description: z.string().min(1),
    })
    .nullable(),
});

/**
 * Orchestrator output schema with strict consistency guarantees.
 */
export const OrchestratorOutputType = z
  .object({
    call_action_items_agent: z.boolean(),
    call_blockers_agent: z.boolean(),
    call_followup_agent: z.boolean(),

    to: z.string().email().nullable(),

    from: z.string().email().nullable(),

    followupIntent: FollowupIntentSchema.nullable(),

    decision_explanation: z.object({
      action_items: z.string().nullable(),
      blockers: z.string().nullable(),
      followup: z.string().nullable(),
    }),
  })
  .superRefine((data, ctx) => {
    /* -------------------------------------------
       FOLLOW-UP ROUTING CONSISTENCY
    -------------------------------------------- */

    // followupIntent must exist IFF followup agent is called
    if (data.call_followup_agent && !data.followupIntent) {
      ctx.addIssue({
        path: ["followupIntent"],
        message: "followupIntent is required when call_followup_agent is true",
        code: z.ZodIssueCode.custom,
      });
    }

    if (!data.call_followup_agent && data.followupIntent) {
      ctx.addIssue({
        path: ["followupIntent"],
        message:
          "followupIntent must be null when call_followup_agent is false",
        code: z.ZodIssueCode.custom,
      });
    }

    /* -------------------------------------------
       RECIPIENT SAFETY
    -------------------------------------------- */

    if (data.call_followup_agent && !data.to) {
      ctx.addIssue({
        path: ["to"],
        message:
          "Explicit 'to' email is required when call_followup_agent is true",
        code: z.ZodIssueCode.custom,
      });
    }

    if (!data.call_followup_agent && data.to) {
      ctx.addIssue({
        path: ["to"],
        message: "'to' must be null when call_followup_agent is false",
        code: z.ZodIssueCode.custom,
      });
    }

    if (!data.call_followup_agent && data.from) {
      ctx.addIssue({
        path: ["from"],
        message: "'from' must be null when call_followup_agent is false",
        code: z.ZodIssueCode.custom,
      });
    }

    /* -------------------------------------------
       CONFIDENCE GATE
    -------------------------------------------- */

    if (
      data.call_followup_agent &&
      data.followupIntent &&
      data.followupIntent.confidence < 0.7
    ) {
      ctx.addIssue({
        path: ["followupIntent", "confidence"],
        message: "confidence must be >= 0.70 when call_followup_agent is true",
        code: z.ZodIssueCode.custom,
      });
    }

    /* -------------------------------------------
       QUERY CONTEXT VALIDATION
    -------------------------------------------- */

    if (
      data.followupIntent?.reason === "client_question" &&
      !data.followupIntent.queryContext
    ) {
      ctx.addIssue({
        path: ["followupIntent", "queryContext"],
        message: "queryContext is required when reason is 'client_question'",
        code: z.ZodIssueCode.custom,
      });
    }

    if (
      data.followupIntent?.reason !== "client_question" &&
      data.followupIntent?.queryContext
    ) {
      ctx.addIssue({
        path: ["followupIntent", "queryContext"],
        message: "queryContext must be null unless reason is 'client_question'",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type OrchestratorDecisionSchema = z.infer<typeof OrchestratorOutputType>;
export type FollowUpIntentInterface = z.infer<typeof FollowupIntentSchema>;
