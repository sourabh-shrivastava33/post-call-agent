import { tool } from "@openai/agents";
import notion from "../../../../src/integrations/notion";
import { MutateNotionExecutionRowSchema } from "./notion_agent_tools.types";
import { prisma } from "../../../../config/prisma";
import { logger } from "../../../../shared/logger";

export const mutateNotionExecutionRowTool = tool({
  name: "mutateNotionExecutionRow",
  description: `
Create or update a Notion execution row.

Rules:
- mode=create → creates row + persists pageId
- mode=update → updates row by pageId
- Input is authoritative
- No schema or view logic
`,
  strict: true,
  parameters: MutateNotionExecutionRowSchema,

  execute: async (args) => {
    /* =========================
       CREATE
       ========================= */
    if (args.mode === "create") {
      if (!args.externalId) {
        throw new Error("externalId is required for create");
      }

      const payload = args.createPayload;

      if (
        !payload.title ||
        !payload.summary ||
        payload.confidence === null ||
        !payload.status ||
        !payload.type ||
        !payload.origin ||
        !payload.meetingId
      ) {
        throw new Error("createPayload is incomplete for create");
      }

      const { pageId } = await notion.createExecutionRow({
        externalId: args.externalId,
        title: payload.title,
        summary: payload.summary,
        owner: payload.owner,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        confidence: payload.confidence,
        status: payload.status,
        type: payload.type,
        origin: payload.origin,
        meetingId: payload.meetingId,
        sourceStartTime: payload.sourceStartTime
          ? new Date(payload.sourceStartTime)
          : undefined,
        sourceEndTime: payload.sourceEndTime
          ? new Date(payload.sourceEndTime)
          : undefined,
      });

      await prisma.executionArtifact.update({
        where: { externalId: args.externalId },
        data: { pageId },
      });

      logger.log("Notion row created", {
        externalId: args.externalId,
        pageId,
      });

      return {
        created: 1,
        updated: 0,
        pageId,
      };
    }

    /* =========================
       UPDATE
       ========================= */
    if (args.mode === "update") {
      if (!args.pageId) {
        throw new Error("pageId is required for update");
      }

      const payload = args.updatePayload;

      const hasAnyUpdate = Object.values(payload).some(
        (value) => value !== null,
      );

      if (!hasAnyUpdate) {
        throw new Error("No fields provided for update");
      }

      await notion.updateExecutionRow(args.pageId, {
        title: payload.title ?? undefined,
        summary: payload.summary ?? undefined,
        owner: payload.owner ?? undefined,
        dueDate:
          payload.dueDate === null
            ? null
            : payload.dueDate
              ? new Date(payload.dueDate)
              : undefined,
        confidence: payload.confidence ?? undefined,
        status: payload.status ?? undefined,
      });

      logger.log("Notion row updated", {
        pageId: args.pageId,
      });

      return {
        created: 0,
        updated: 1,
        pageId: args.pageId,
      };
    }

    throw new Error("Invalid mutation mode");
  },
});
