import { prisma } from "../../config/prisma";

/**
 * Fetch FULL canonical data for an artifact using externalId
 * Used during ADD flow (page creation)
 */
export async function fetchExecutionArtifactByExternalId(externalId: string) {
  const artifact = await prisma.executionArtifact.findFirst({
    where: {
      externalId,
    },
    select: {
      externalId: true,
      title: true,
      summary: true,
      owner: true,
      dueDate: true,
      confidence: true,
      sourceStartTime: true,
      sourceEndTime: true,
      type: true,
    },
  });

  if (!artifact) {
    throw new Error(`ExecutionArtifact not found for externalId=${externalId}`);
  }

  return {
    title: artifact.title,
    summary: artifact.summary,
    owner: artifact.owner,
    dueDate: artifact.dueDate,
    confidence: artifact.confidence,
    sourceStartTime: artifact.sourceStartTime,
    sourceEndTime: artifact.sourceEndTime,
    type: artifact.type,
  };
}

export type ExecutionArtifactUpdatableFields = {
  summary?: boolean;
  owner?: boolean;
  dueDate?: boolean;
  confidence?: boolean;
};

/**
 * Fetch ONLY requested fields using Notion pageId
 * Used during UPDATE flow
 */
export async function fetchExecutionArtifactByPageId(
  pageId: string,
  fields: ExecutionArtifactUpdatableFields,
) {
  const select: Record<string, boolean> = {
    pageId: true, // always needed for safety
  };

  if (fields.summary) select.summary = true;
  if (fields.owner) select.owner = true;
  if (fields.dueDate) select.dueDate = true;
  if (fields.confidence) select.confidence = true;

  const artifact = await prisma.executionArtifact.findFirst({
    where: {
      pageId,
    },
    select,
  });

  if (!artifact) {
    throw new Error(`ExecutionArtifact not found for pageId=${pageId}`);
  }

  // Strip pageId before returning to mutation tool
  const { pageId: _, ...data } = artifact;

  return data;
}
