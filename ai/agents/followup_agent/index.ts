// followup_agent.ts
import { Runner } from "@openai/agents";
import BaseAgent from "../baseAgent";
import { FOLLOWUP_AGENT_INSTRUCTIONS } from "./followup_agent.instructions";
import {
  FollowupAgentInitParams,
  FollowUpAgentOutputType,
} from "./followup_agent.type";
import { sendFollowupEmail } from "./tools/send_followup_email";
import { ExecutionContext } from "../../execution_orchasterate/execution_context";
import { logger } from "../../../shared/logger";
import FollowupAgentConstants from "./constants";
import { FollowUpIntentInterface } from "../orchestrator_agent/orchestrator_agent_types";
import { ActionItemsAgentOutput } from "../action__items_agents/action_items_agent_types";
import { BlockersReconciliationOutput } from "../handoffs/blockers_agent_handoffs/reconciliation_agent/recociliation_agent.types";
import {
  ExtendedActionItemsType,
  ExtendedBlockersType,
} from "../../followup_orchestrate/followup_orchestrate.types";

class FollowUpAgent extends BaseAgent<ExecutionContext> {
  private runner = new Runner();

  constructor() {
    super(
      FollowupAgentConstants.name,
      FOLLOWUP_AGENT_INSTRUCTIONS,
      FollowupAgentConstants.model,
      FollowUpAgentOutputType,
      FollowupAgentConstants.modelSettings,
      [sendFollowupEmail as any]
    );
  }

  async init({
    actionItems,
    blockers,
    followupIntent,
  }: FollowupAgentInitParams) {
    const agent = this.getAgent();

    if (!followupIntent) return;

    let userQuery = this.buildReconciledContextString({
      followupIntent,
      actionItems,
      blockers,
    });

    const result = await this.runner.run(agent, userQuery);

    if (!result?.finalOutput) {
      return { emails: [], warnings: ["empty_output"] };
    }

    let parsed = result.finalOutput;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (err) {
        // Attempt to extract a JSON object from the string if the model
        // returned explanatory text around the JSON (e.g. "The follow... { ... }")
        const match = parsed.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
            logger.log("Parsed JSON by extracting object from model output");
          } catch (err2) {
            logger.log("Failed to parse JSON after extraction", err2);
            throw new Error("invalid_json_output");
          }
        } else {
          logger.log("No JSON object found in model output");
          throw new Error("invalid_json_output");
        }
      }
    }

    const output = FollowUpAgentOutputType.parse(parsed);

    logger.log(`📨 Follow-up emails generated: ${output.emails.length}`);

    return output;
  }

  buildFollowupIntentString(intent: FollowUpIntentInterface): string {
    switch (intent.reason) {
      case "explicit_commitment":
        return "This email is a follow-up on a commitment made during the meeting.";

      case "recap_request":
        return "This email is sent in response to a request for a recap of the discussion.";

      case "client_question":
        return `This email addresses a client question regarding ${intent.queryContext?.topic}.`;

      default:
        return "This email is a follow-up related to the meeting.";
    }
  }

  summarizeActionAdds(adds: ExtendedActionItemsType["add"]): string {
    if (!adds.length) return "";

    return (
      "New action items agreed upon:\n" +
      adds
        .map((item) => {
          const due = item.dueDate ? ` (due by ${item.dueDate})` : "";
          const owner = item.owner ? `, owned by ${item.owner}` : "";
          return `- ${item.title}${due}${owner}.`;
        })
        .join("\n")
    );
  }
  summarizeActionUpdates(updates: ExtendedActionItemsType["update"]): string {
    if (!updates.length) return "";

    return (
      "Updates to existing action items:\n" +
      updates
        .map((item) => {
          const changes: string[] = [];

          if (item.updated_summary) changes.push("summary updated");
          if (item.updated_dueDate)
            changes.push(`due date updated to ${item.updated_dueDate}`);
          if (item.updated_owner)
            changes.push(`owner updated to ${item.updated_owner}`);

          return `- Action item ${item.id}: ${changes.join(", ")}.`;
        })
        .join("\n")
    );
  }
  summarizeBlockerAdds(adds: ExtendedBlockersType["add"]): string {
    if (!adds.length) return "";

    return (
      "New blockers identified:\n" +
      adds
        .map((b) => {
          const owner = b.owner ? ` (owner: ${b.owner})` : "";
          return `- ${b.title}${owner}: ${b.summary}.`;
        })
        .join("\n")
    );
  }

  summarizeBlockerUpdates(updates: ExtendedBlockersType["update"]): string {
    if (!updates.length) return "";

    return (
      "Updates to existing blockers:\n" +
      updates
        .map((b) => {
          const changes: string[] = [];
          if (b.summary) changes.push("additional context added");
          if (b.owner) changes.push(`owner assigned: ${b.owner}`);
          if (b.confidence) changes.push("confidence increased");

          return `- Blocker ${b.id}: ${changes.join(", ")}.`;
        })
        .join("\n")
    );
  }
  buildReconciledContextString(params: {
    followupIntent: FollowUpIntentInterface;
    actionItems?: ExtendedActionItemsType;
    blockers?: ExtendedBlockersType;
  }): string {
    const sections: string[] = [];

    sections.push(this.buildFollowupIntentString(params.followupIntent));

    if (params.actionItems) {
      sections.push(
        this.summarizeActionAdds(params.actionItems.add),
        this.summarizeActionUpdates(params.actionItems.update)
      );
    }

    if (params.blockers) {
      sections.push(
        this.summarizeBlockerAdds(params.blockers.add),
        this.summarizeBlockerUpdates(params.blockers.update)
      );
    }

    return sections.filter(Boolean).join("\n\n");
  }
}

export default FollowUpAgent;
