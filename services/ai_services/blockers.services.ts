import { prisma } from "../../config/prisma";
import { randomUUID } from "crypto";
import { ExecutionArtifactType } from "../../generated/prisma";

interface UpdateBlockerInterface {
  id: string;
  summary?: string; // blocker text
  owner?: string | null;
  confidence?: number; // 0.0 – 1.0 (LLM scale)
}

class BlockersService {
  private meetingId: string;

  constructor(meetingId: string) {
    this.meetingId = meetingId;
  }

  /**
   * Bulk create blockers
   */
  async createAllBlockers(
    createBlockersData: {
      summary: string;
      owner: string | null;
      confidence: number;
      sourceStartTime?: string | null;
      sourceEndTime?: string | null;
      externalId?: string | null;
    }[]
  ) {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: this.meetingId },
      });
      if (!meeting) {
        console.error(
          `Cannot create blockers: meeting ${this.meetingId} not found`
        );
        throw new Error(`Meeting not found: ${this.meetingId}`);
      }
      await prisma.executionArtifact.createMany({
        data: createBlockersData.map((item) => {
          const data: any = {
            meetingId: this.meetingId,
            type: ExecutionArtifactType.BLOCKER,
            title: item.summary,
            summary: item.summary,
            owner: item.owner,
            confidence: Math.round(item.confidence * 100),
            externalId: item.externalId || randomUUID(),
          };
          if (item.sourceStartTime) {
            data.sourceStartTime = new Date(item.sourceStartTime);
          }
          if (item.sourceEndTime) {
            data.sourceEndTime = new Date(item.sourceEndTime);
          }
          return data;
        }),
      });
    } catch (error) {
      console.error("Failed to create blockers", error);
      throw error;
    }
  }

  /**
   * Bulk update blockers
   */
  async updateAllBlockers(
    updateBlockersData: {
      id: string;
      title?: string;
      summary?: string;
      owner?: string | null;
      confidence?: number;
    }[]
  ) {
    const updatePayload = updateBlockersData.map((item) => {
      const updateData: any = {};
      if (item.summary !== undefined) updateData.summary = item.summary;
      if (item.owner !== undefined) updateData.owner = item.owner;
      if (item.title !== undefined) updateData.title = item.title;
      if (item.confidence !== undefined)
        updateData.confidence = Math.round(item.confidence * 100);

      return {
        where: { id: item.id },
        data: updateData,
      };
    });

    try {
      await prisma.executionArtifact.updateMany({
        data: updatePayload,
      });
    } catch (error) {
      console.error("Failed to update blockers", error);
      throw error;
    }
  }

  /**
   * Fetch ONLY blockers for this meeting
   */
  async getAllOpenBlockersByMeetingId() {
    try {
      return await prisma.executionArtifact.findMany({
        where: {
          meetingId: this.meetingId,
          type: ExecutionArtifactType.BLOCKER,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    } catch (error) {
      console.error("Failed to fetch blockers", error);
      return [];
    }
  }

  /**
   * Update an existing blocker safely
   */
  async updateBlocker({
    id,
    summary,
    owner,
    confidence,
  }: UpdateBlockerInterface) {
    const updateData: any = {};

    if (summary !== undefined) {
      updateData.summary = summary;
    }

    if (owner !== undefined) {
      updateData.owner = owner;
    }

    if (confidence !== undefined) {
      // Convert LLM confidence (0–1) → DB confidence (0–100)
      updateData.confidence = Math.round(confidence * 100);
    }

    if (Object.keys(updateData).length === 0) {
      return;
    }

    try {
      await prisma.executionArtifact.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      console.error(`Failed to update blocker ${id}`, error);
      throw error;
    }
  }

  /**
   * Create a new blocker
   * (used by reconciliation ADD path)
   */
  async createBlocker({
    summary,
    owner,
    confidence,
    sourceStartTime,
    sourceEndTime,
    externalId,
  }: {
    summary: string;
    owner: string | null;
    confidence: number; // 0–1
    sourceStartTime: Date;
    sourceEndTime: Date;
    externalId?: string | null;
  }) {
    try {
      return await prisma.executionArtifact.create({
        data: {
          meetingId: this.meetingId,
          type: ExecutionArtifactType.BLOCKER,
          title: summary,
          summary,
          owner,
          confidence: Math.round(confidence * 100),
          sourceStartTime,
          sourceEndTime,
          externalId: externalId || randomUUID(),
        },
      });
    } catch (error) {
      console.error("Failed to create blocker", error);
      throw error;
    }
  }
}

export default BlockersService;
