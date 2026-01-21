import { tool } from "@openai/agents";
import {
  ExecutionArtifactOrigin,
  ExecutionArtifactStatus,
  ExecutionArtifactType,
} from "../../../../generated/prisma";
import { prisma } from "../../../../config/prisma";
import { BuildNotionMutationPayloadSchema } from "./notion_agent_tools.types";

export const buildNotionMutationPayloadTool = tool({
  name: "buildNotionMutationPayload",
  description: `
Build a payload for mutateNotionExecutionRow from ExecutionArtifact.

Rules:
- externalId is authoritative
- If fields are provided → UPDATE payload
- If fields are not provided → CREATE payload
- Fetches data from DB only
- No inference or mutation
`,
  strict: true,
  parameters: BuildNotionMutationPayloadSchema,

  execute: async (args: any) => {
    const artifact = await prisma.executionArtifact.findUnique({
      where: { externalId: args.externalId },
    });

    if (!artifact) {
      throw new Error(
        `ExecutionArtifact not found for externalId=${args.externalId}`,
      );
    }

    const hasAnyUpdateField = Object.values(args.fields).some(Boolean);

    /* =========================
     UPDATE
     ========================= */
    if (artifact.pageId && hasAnyUpdateField) {
      const updatePayload: Record<string, any> = {};

      if (args.fields.title) updatePayload.title = artifact.title;
      if (args.fields.summary) updatePayload.summary = artifact.summary;
      if (args.fields.owner) updatePayload.owner = artifact.owner;
      if (args.fields.dueDate) updatePayload.dueDate = artifact.dueDate;
      if (args.fields.confidence)
        updatePayload.confidence = artifact.confidence / 100;
      if (args.fields.status)
        updatePayload.status = artifact.status as ExecutionArtifactStatus;

      return {
        mode: "update",
        pageId: artifact.pageId,
        updatePayload,
      };
    }

    /* =========================
     CREATE
     ========================= */
    return {
      mode: "create",
      externalId: args.externalId,
      createPayload: {
        title: artifact.title,
        summary: artifact.summary,
        owner: artifact.owner,
        dueDate: artifact.dueDate,
        confidence: artifact.confidence / 100,
        status: ExecutionArtifactStatus.PLANNED,
        type: artifact.type as ExecutionArtifactType,
        origin: artifact.origin as ExecutionArtifactOrigin,
        meetingId: artifact.meetingId,
        sourceStartTime: artifact.sourceStartTime,
        sourceEndTime: artifact.sourceEndTime,
      },
    };
  },
});
