import { prisma } from "../../config/prisma";
import { randomUUID } from "crypto";
import {} from "@prisma/client";
import {
  ExecutionArtifactOrigin,
  ExecutionArtifactType,
} from "../../generated/prisma";
import {
  PersistExecutionPayload,
  ActionItemAddWithExternalId,
} from "../../ai/execution_orchasterate/execution_context";
import { ExtendedActionItemsType } from "../../ai/followup_orchestrate/followup_orchestrate.types";

class ActionItemsServices {
  private meetingId: string;

  constructor(meetingId: string) {
    this.meetingId = meetingId;
  }

  /**
   * Fetch ONLY action items for this meeting
   */
  async getAllActionItems() {
    try {
      return await prisma.executionArtifact.findMany({
        where: {
          type: ExecutionArtifactType.ACTION,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          confidence: true,
          dueDate: true,
          externalId: true,
          meetingId: true,
          owner: true,
          title: true,
          summary: true,
        },
      });
    } catch (error) {
      console.error("Failed to fetch action items", error);
      return [];
    }
  }

  async createAllActionItems(
    createActionItemsData: ActionItemAddWithExternalId[],
  ) {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: this.meetingId },
      });
      if (!meeting) {
        console.error(
          `Cannot create action items: meeting ${this.meetingId} not found`,
        );
        throw new Error(`Meeting not found: ${this.meetingId}`);
      }
      await prisma.executionArtifact.createMany({
        data: createActionItemsData.map((item) => {
          const data: any = {
            meetingId: this.meetingId,
            type: ExecutionArtifactType.ACTION,
            title: item.title || item.summary,
            summary: item.summary,
            owner: item.owner,
            externalId: item.externalId || randomUUID(),
            origin: ExecutionArtifactOrigin.ACTION_ITEMS_AGENT,
            confidence: Math.round(item.confidence * 100),
          };

          if (item.dueDate) {
            data.dueDate = new Date(item.dueDate);
          } else if (item.dueDate === null) {
            data.dueDate = null;
          }

          if (item.sourceStartTime)
            data.sourceStartTime = new Date(item.sourceStartTime);
          if (item.sourceEndTime)
            data.sourceEndTime = new Date(item.sourceEndTime);

          return data;
        }),
      });
    } catch (error) {
      console.error("Failed to create action items", error);
      throw error;
    }
  }

  /**
   * Update an existing action item safely
   */
  async updateAllActionItems(
    updateActionItemsData: ExtendedActionItemsType["update"],
  ) {
    if (updateActionItemsData.length === 0) return;

    try {
      const operations = updateActionItemsData.map((item) => {
        const updateData: any = {};

        if (item.summary !== undefined) {
          updateData.summary = item.summary;
        }

        if (item.owner !== undefined) {
          updateData.owner = item.owner;
        }

        if (item.dueDate !== undefined) {
          updateData.dueDate = item.dueDate ? new Date(item.dueDate) : null;
        }

        if (item.confidence !== undefined) {
          // Normalize 0–1 → 0–100
          updateData.confidence = Math.round(item.confidence * 100);
        }

        return prisma.executionArtifact.update({
          where: { id: item.id },
          data: updateData,
        });
      });

      return operations;
    } catch (error) {
      console.error("Failed to update action items", error);
      throw error;
    }
  }
}

export default ActionItemsServices;
