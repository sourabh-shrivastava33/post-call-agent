import { z } from "zod";

export const MutateNotionExecutionRowSchema = z.object({
  mode: z.enum(["create", "update"]),

  /* =========================
     Identifiers
     ========================= */
  externalId: z.string().nullable(),
  pageId: z.string().nullable(),

  /* =========================
     Create payload (always present, nullable)
     ========================= */
  createPayload: z.object({
    title: z.string().nullable(),
    summary: z.string().nullable(),
    owner: z.string().nullable(),
    dueDate: z.string().nullable(),
    confidence: z.number().nullable(),
    status: z.enum(["PLANNED", "IN_PROGRESS", "DONE"]).nullable(),
    type: z.enum(["ACTION", "BLOCKER"]).nullable(),
    origin: z.string().nullable(),
    meetingId: z.string().nullable(),
    sourceStartTime: z.string().nullable(),
    sourceEndTime: z.string().nullable(),
  }),

  /* =========================
     Update payload (always present, nullable)
     ========================= */
  updatePayload: z.object({
    title: z.string().nullable(),
    summary: z.string().nullable(),
    owner: z.string().nullable(),
    dueDate: z.string().nullable(),
    confidence: z.number().nullable(),
    status: z.enum(["PLANNED", "IN_PROGRESS", "DONE"]).nullable(),
  }),
});

export const BuildNotionMutationPayloadSchema = z.object({
  externalId: z.string(),

  fields: z.object({
    title: z.boolean(),
    summary: z.boolean(),
    owner: z.boolean(),
    dueDate: z.boolean(),
    confidence: z.boolean(),
    status: z.boolean(),
    origin: z.boolean(),
    externalId: z.boolean(),
    sourceStartTime: z.boolean(),
    sourceEndTime: z.boolean(),
  }),
});

export const SlackConfirmationSchema = z.object({
  meetingId: z.string(),
  notionDatabaseUrl: z.string().nullable(),

  result: z.object({
    created: z.number(),
    updated: z.number(),
  }),

  errors: z.array(z.string()),
});

export type slackConfirmationSchemaType = z.infer<
  typeof SlackConfirmationSchema
>;
