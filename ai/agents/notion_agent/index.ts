import "dotenv/config";
import { Runner } from "@openai/agents";
import BaseAgent from "../baseAgent";
import { z } from "zod";
import { NOTION_EXECUTION_AGENT_INSTRUCTIONS } from "./notion_agent.instructions";
import { buildNotionMutationPayloadTool } from "./tools/notion_agent_build_notion_mutation_payload.tool";
import { mutateNotionExecutionRowTool } from "./tools/notion_agent_mutation_db_tool";
import { logger } from "../../../shared/logger";
import { NotionInputInterface } from "./notion_agent.types";
import {
  sendSlackExecutionConfirmationMessage,
  sendSlackExecutionConfirmationTool,
} from "./tools/notion_agent_slack_confirmation_tool";
import { slackLogger } from "../../../models/meetings/slack/slack.logger";
import {
  agentJoinedMeetingBlocks,
  executionSuccessBlocks,
} from "../../../models/meetings/slack/slack.utility";

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

  async run(
    input: NotionInputInterface,
    meetingId: string,
  ): Promise<NotionExecutionResult> {
    const agent = this.getAgent();

    const result = await this.runner.run(agent, JSON.stringify(input));

    if (!result?.finalOutput) {
      throw new Error("Empty output from NotionExecutionAgent");
    }

    const parseFinalOutput = (output: unknown) => {
      if (typeof output === "object") {
        return JSON.parse(JSON.stringify(output));
      }

      if (typeof output !== "string") {
        throw new Error("Invalid finalOutput type");
      }

      const trimmed = output.trim();

      if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
        throw new Error(`Non-JSON output:\n${trimmed}`);
      }

      return JSON.parse(trimmed);
    };

    const parsed = NotionExecutionResultSchema.parse(
      parseFinalOutput(result.finalOutput),
    );

    await slackLogger.log(
      executionSuccessBlocks({
        created: parsed.created,
        updated: parsed.updated,
        notionUrl: process.env.NOTION_DB_URL!,
      }),
      undefined,
      process.env.SLACK_POST_CALL_EXECUTION_CHANNEL,
    );
    // 🔒 deterministic Slack confirmation

    return parsed;
  }
}
