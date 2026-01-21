import {
  ActionItemAddWithExternalId,
  BlockerAddWithExternalId,
  ExecutionContext,
  PersistExecutionPayload,
} from "./execution_context";
import { logger } from "../../shared/logger";
import OrchestratorAgent from "../agents/orchestrator_agent";
import { TranscriptSegment } from "../../generated/prisma";
import ActionItemsAgent from "../agents/action__items_agents";

import BlockersAgent from "../agents/blocker_items_agent";

import ExecutionOrchestrateServices from "./excution_orchasterator.services";
import ActionItemsAgentConstants from "../agents/action__items_agents/constants";
import BlockerItemsAgentConstants from "../agents/blocker_items_agent/contants";
import FollowUpOrchestrator from "../followup_orchestrate";
import {
  ExtendedActionAdd,
  ExtendedActionItemsType,
  ExtendedActionItemsTypeNotion,
  ExtendedBlockersType,
} from "../followup_orchestrate/followup_orchestrate.types";
import { randomUUID } from "node:crypto";
import NotionExecutionAgent from "../agents/notion_agent";
import { withTrace } from "@openai/agents";
import { NotionInputInterface } from "../agents/notion_agent/notion_agent.types";
import { mergeItemWithNotionPayload } from "./utility";

interface OrchestratorRunParams {
  context: ExecutionContext;
  transcriptSegments: TranscriptSegment[] | [];
  onCallbacks: {
    onWorkflowStarted: () => Promise<void>;
    onWorkflowCompleted: () => Promise<void>;
    onWorkflowFailed: (failureReason: string) => Promise<void>;
  };
}
class ExecutionOrchestrate {
  private orchestrator: OrchestratorAgent;
  private actionItemsAgent: ActionItemsAgent;
  private blockersAgent: BlockersAgent;
  private executionServices: ExecutionOrchestrateServices | null = null;
  private followupOrchestrator: FollowUpOrchestrator | null = null;
  private notionAgent: NotionExecutionAgent;
  constructor() {
    this.orchestrator = new OrchestratorAgent();
    this.actionItemsAgent = new ActionItemsAgent();
    this.blockersAgent = new BlockersAgent();
    this.notionAgent = new NotionExecutionAgent();
  }
  async run({
    context,
    transcriptSegments,
    onCallbacks,
  }: OrchestratorRunParams) {
    try {
      logger.log(
        `Execution started for the meeting with as ID ${context.meetingId}`,
      );

      const orchestratorAgent = this.orchestrator;
      const transcriptString = this.getTranscriptString(transcriptSegments);

      let _call_action_items_agent;
      let _call_blockers_agent;
      let _call_followup_agent;
      let _followupIntent;
      let _to;
      let _from;

      const {
        call_action_items_agent,
        call_blockers_agent,
        call_followup_agent,
        followupIntent,
        to,
        from,
      } = await orchestratorAgent.analyzeTranscript(transcriptString);
      _call_action_items_agent = call_action_items_agent;
      _call_followup_agent = call_followup_agent;
      _call_blockers_agent = call_blockers_agent;
      _followupIntent = followupIntent;
      _from = from || null;
      _to = to || null;

      const isAnyAgentCalled =
        _call_action_items_agent ||
        _call_blockers_agent ||
        (_call_followup_agent && _followupIntent);

      if (!isAnyAgentCalled) return;

      let agentRunPromise = [];
      if (_call_action_items_agent)
        agentRunPromise.push(
          this.actionItemsAgent.runExecutionPipeline(transcriptString, context),
        );
      if (_call_blockers_agent)
        agentRunPromise.push(
          this.blockersAgent.runExecutionPipeline(transcriptString, context),
        );

      const [actionItemsResult, blockersResult] =
        await Promise.all(agentRunPromise);

      const { new_action_items, new_blockers } = this.createPersistPayload(
        actionItemsResult?.action_items,
        blockersResult?.blockers,
      );

      let persistObj: PersistExecutionPayload = {};
      if (
        (new_action_items.add.length || new_action_items.update.length) &&
        actionItemsResult.confidence >=
          ActionItemsAgentConstants.confidenceThreshold
      ) {
        persistObj["actionItems"] = new_action_items;
      }
      if (
        (new_blockers.add.length || new_blockers.update.length) &&
        blockersResult.confidence >=
          BlockerItemsAgentConstants.confidenceThreshold
      ) {
        persistObj["blockers"] = new_blockers;
      }

      this.executionServices = new ExecutionOrchestrateServices(
        context.meetingId,
      );

      if (!Object.keys(persistObj).length)
        throw new Error("No data to persist or change");

      await this.executionServices.persistExecutionResults(persistObj);

      const followupOrchestrate = new FollowUpOrchestrator(
        actionItemsResult.action_items,
        blockersResult.blockers,
        _followupIntent,
      );
      await followupOrchestrate.run();
      const notionAgentPayload = this.createNotionAgentPayload(
        new_action_items,
        new_blockers,
      );

      await this.notionAgent.run(notionAgentPayload);
    } catch (error) {
      const failureReason =
        error instanceof Error ? error.message : JSON.stringify(error);
      onCallbacks?.onWorkflowFailed!(failureReason);
      console.log(error);
      throw error;
    }
  }

  getTranscriptString(transcriptSegments: TranscriptSegment[]): string {
    if (!transcriptSegments || !transcriptSegments.length)
      throw new Error("No transcript segments provided");

    return transcriptSegments.reduce((acc, curr) => {
      return (acc = `${acc} ${curr.speaker}: ${
        curr.text
      } (start: ${curr.startTime.toISOString()}, end: ${curr.endTime.toISOString()})\n`);
    }, "");
  }

  createPersistPayload(
    action_items?: ExtendedActionItemsType,
    blockers?: ExtendedBlockersType,
  ): {
    new_action_items: {
      add: ActionItemAddWithExternalId[];
      update: ExtendedActionItemsType["update"];
    };
    new_blockers: {
      add: BlockerAddWithExternalId[];
      update: ExtendedBlockersType["update"];
    };
  } {
    const newActionPayload = {
      add: [] as ActionItemAddWithExternalId[],
      update: [] as ExtendedActionItemsType["update"],
    };

    const newBlockersPayload = {
      add: [] as BlockerAddWithExternalId[],
      update: [] as ExtendedBlockersType["update"],
    };

    if (action_items?.add?.length) {
      newActionPayload.add = action_items.add.map((item) => ({
        ...item,
        externalId: randomUUID(),
      }));
    }

    if (action_items?.update?.length) {
      newActionPayload.update = action_items.update;
    }

    if (blockers?.add?.length) {
      newBlockersPayload.add = blockers.add.map((item) => ({
        ...item,
        externalId: randomUUID(),
      }));
    }

    if (blockers?.update?.length) {
      newBlockersPayload.update = blockers.update;
    }

    return {
      new_action_items: newActionPayload,
      new_blockers: newBlockersPayload,
    };
  }

  createNotionAgentPayload(
    actionItems: {
      add: ActionItemAddWithExternalId[];
      update: ExtendedActionItemsType["update"];
    },
    blockers: {
      add: BlockerAddWithExternalId[];
      update: ExtendedBlockersType["update"];
    },
  ): NotionInputInterface {
    let notionAdd: NotionInputInterface["add"] = [];
    let notionUpdate: NotionInputInterface["update"] = [];

    mergeItemWithNotionPayload(actionItems, notionAdd, notionUpdate);
    mergeItemWithNotionPayload(blockers, notionAdd, notionUpdate);
    return { add: notionAdd, update: notionUpdate };
  }
}

export default ExecutionOrchestrate;
