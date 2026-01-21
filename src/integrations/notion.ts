import "dotenv/config";
import { Client } from "@notionhq/client";
import { logger } from "../../shared/logger";

/**
 * This integration assumes:
 * - Database already exists
 * - Schema already exists
 * - Views are managed manually
 *
 * The agent ONLY creates & updates rows.
 */

export type CreateExecutionRowInput = {
  externalId: string;
  title: string;
  summary: string;
  owner?: string | null;
  dueDate?: Date | null;
  confidence: number;
  status: "PLANNED" | "IN_PROGRESS" | "DONE";
  type: "ACTION" | "BLOCKER";
  origin: string;
  meetingId: string;
  sourceStartTime?: Date;
  sourceEndTime?: Date;
};

export type UpdateExecutionRowInput = Partial<{
  title: string;
  summary: string;
  owner: string | null;
  dueDate: Date | null;
  confidence: number;
  status: "PLANNED" | "IN_PROGRESS" | "DONE";
}>;

class NotionIntegration {
  private client: Client;
  private databaseId: string;

  constructor() {
    if (!process.env.NOTION_KEY) {
      throw new Error("NOTION_KEY missing");
    }

    if (!process.env.NOTION_EXECUTION_DB_ID) {
      throw new Error("NOTION_EXECUTION_DB_ID missing");
    }

    this.client = new Client({
      auth: process.env.NOTION_KEY,
    });

    this.databaseId = process.env.NOTION_EXECUTION_DB_ID;
  }

  /* =========================================================
     CREATE ROW
     ========================================================= */

  async createExecutionRow(
    input: CreateExecutionRowInput,
  ): Promise<{ pageId: string }> {
    try {
      const response = await this.client.pages.create({
        parent: {
          database_id: this.databaseId,
        },
        properties: {
          /* =========================
           REQUIRED
           ========================= */
          Name: {
            title: [{ text: { content: input.title } }],
          },

          "External ID": {
            rich_text: [{ text: { content: input.externalId } }],
          },

          Status: {
            select: { name: input.status },
          },

          Type: {
            select: { name: input.type },
          },

          Origin: {
            select: { name: input.origin },
          },

          Confidence: {
            number: input.confidence,
          },

          "Meeting ID": {
            rich_text: [{ text: { content: input.meetingId } }],
          },

          /* =========================
           OPTIONAL
           ========================= */
          ...(input.owner && {
            Owner: {
              rich_text: [{ text: { content: input.owner } }],
            },
          }),

          ...(input.dueDate && {
            "Due Date": {
              date: { start: input.dueDate.toISOString() },
            },
          }),

          ...(input.sourceStartTime && {
            "Source Start": {
              date: { start: input.sourceStartTime.toISOString() },
            },
          }),

          ...(input.sourceEndTime && {
            "Source End": {
              date: { start: input.sourceEndTime.toISOString() },
            },
          }),
        },
      });

      return { pageId: response.id };
    } catch (error: any) {
      logger.error("Failed to create Notion row", {
        error: error?.message,
        externalId: input.externalId,
      });
      throw error;
    }
  }

  /* =========================================================
     UPDATE ROW (FIELD LEVEL ONLY)
     ========================================================= */

  async updateExecutionRow(
    pageId: string,
    updates: UpdateExecutionRowInput,
  ): Promise<void> {
    const properties: Record<string, any> = {};

    if (updates.title !== undefined) {
      properties.Name = {
        title: [{ text: { content: updates.title } }],
      };
    }

    if (updates.owner !== undefined) {
      properties.Owner = updates.owner
        ? { rich_text: [{ text: { content: updates.owner } }] }
        : { rich_text: [] };
    }

    if (updates.dueDate !== undefined) {
      properties["Due Date"] = updates.dueDate
        ? { date: { start: updates.dueDate.toISOString() } }
        : { date: null };
    }

    if (updates.confidence !== undefined) {
      properties.Confidence = { number: updates.confidence };
    }

    if (updates.status !== undefined) {
      properties.Status = {
        select: { name: updates.status },
      };
    }

    if (Object.keys(properties).length === 0) {
      logger.warn("Skipping Notion update: no fields provided", { pageId });
      return;
    }

    try {
      await this.client.pages.update({
        page_id: pageId,
        properties,
      });
    } catch (error: any) {
      logger.error("Failed to update Notion row", {
        error: error?.message,
        pageId,
      });
      throw error;
    }
  }
}

export default new NotionIntegration();
