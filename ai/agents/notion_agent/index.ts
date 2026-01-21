import { Runner } from "@openai/agents";
import BaseAgent from "../baseAgent";
import { z } from "zod";
import { NOTION_EXECUTION_AGENT_INSTRUCTIONS } from "./notion_agent.instructions";
import { buildNotionMutationPayloadTool } from "./tools/notion_agent_build_notion_mutation_payload.tool";
import { mutateNotionExecutionRowTool } from "./tools/notion_agent_mutation_db_tool";
import { logger } from "../../../shared/logger";
import { NotionInputInterface } from "./notion_agent.types";

/* ============================
   Output schema
   ============================ */
const NotionExecutionResultSchema = z.object({
  created: z.number(),
  updated: z.number(),
  errors: z.array(z.string()),
});

type NotionExecutionResult = z.infer<typeof NotionExecutionResultSchema>;

/* ============================
   Mutation payload schema
   ============================ */
const NotionMutationPayloadSchema = z.union([
  z.object({
    mode: z.literal("create"),
    externalId: z.string(),
    createPayload: z.record(z.any()),
  }),
  z.object({
    mode: z.literal("update"),
    pageId: z.string(),
    updatePayload: z.record(z.any()),
  }),
]);

type NotionMutationPayload = z.infer<typeof NotionMutationPayloadSchema>;

function parseRunnerOutput(output: unknown): NotionMutationPayload {
  if (!output) {
    throw new Error("Empty finalOutput from tool");
  }

  const parsed = typeof output === "string" ? JSON.parse(output) : output;

  return NotionMutationPayloadSchema.parse(parsed);
}

/* ============================
   Agent
   ============================ */
export default class NotionExecutionAgent extends BaseAgent {
  private runner = new Runner();

  constructor() {
    super(
      "Notion Execution Agent",
      NOTION_EXECUTION_AGENT_INSTRUCTIONS,
      "gpt-4o",
      NotionExecutionResultSchema,
      {
        temperature: 0,
        top_p: 1,
        tool_choice: "required",
        max_tokens: 700,
      },
      [buildNotionMutationPayloadTool, mutateNotionExecutionRowTool],
      [],
    );
  }

  async run(input: NotionInputInterface): Promise<NotionExecutionResult> {
    const agent = this.getAgent();
    try {
      const result = await this.runner.run(agent, JSON.stringify(input));

      if (!result?.finalOutput) {
        throw new Error("Empty output from NotionExecutionAgent");
      }

      const parsed =
        typeof result.finalOutput === "string"
          ? JSON.parse(result.finalOutput)
          : result.finalOutput;

      return NotionExecutionResultSchema.parse(parsed);
    } catch (error) {
      throw error;
    }
  }
}
