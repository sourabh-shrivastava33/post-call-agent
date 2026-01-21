import { ReconciliationsAgentOutputInterface } from "../agents/handoffs/action_items_agent_handoffs/reconciliation_agent/reconciliation_agent.type";
import { BlockersReconciliationOutput } from "../agents/handoffs/blockers_agent_handoffs/reconciliation_agent/recociliation_agent.types";
import { FollowUpIntentInterface } from "../agents/orchestrator_agent/orchestrator_agent_types";
import FollowUpAgent from "../agents/followup_agent";
import {
  ExtendedActionItemsType,
  ExtendedBlockersType,
} from "./followup_orchestrate.types";
import { ExecutionContext } from "../execution_orchasterate/execution_context";
import { FollowupAgentInitParams } from "../agents/followup_agent/followup_agent.type";
import NotionExecutionAgent from "../agents/notion_agent";

class FollowUpOrchestrator {
  private followupData: {
    action_items?: ExtendedActionItemsType;
    blockers?: ExtendedBlockersType;
    followupIntent?: FollowUpIntentInterface | null;
  } = {};
  private followupAgent: FollowUpAgent = new FollowUpAgent();
  private notionAgent: NotionExecutionAgent = new NotionExecutionAgent();

  constructor(
    action_items?: ExtendedActionItemsType,
    blockers?: ExtendedBlockersType,
    followupIntent?: FollowUpIntentInterface | null,
  ) {
    this.followupData.action_items = action_items;
    this.followupData.blockers = blockers;
    this.followupData.followupIntent = followupIntent ?? null;
  }

  async run() {
    let followupPayload: FollowupAgentInitParams = {};
    if (this.followupData.followupIntent)
      followupPayload["followupIntent"] = this.followupData.followupIntent;
    if (
      this.followupData.action_items &&
      Object.keys(this.followupData.action_items).length
    )
      followupPayload["actionItems"] = this.followupData.action_items;

    if (
      this.followupData.blockers &&
      Object.keys(this.followupData.blockers).length
    )
      followupPayload["blockers"] = this.followupData.blockers;

    try {
      const followupAgentResult =
        await this.followupAgent.init(followupPayload);

      console.log(JSON.stringify(followupAgentResult));
    } catch (error) {
      console.log(error);
    }

    try {
    } catch (error) {}
  }

  createNotionExecutionPayload() {}
}

export default FollowUpOrchestrator;
