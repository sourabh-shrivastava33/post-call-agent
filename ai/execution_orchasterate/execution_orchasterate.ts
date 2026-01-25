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
      const transcriptString = true
        ? `Rahul: Alright everyone, let’s get started. Today I want to quickly review how things have been progressing since the last demo, flag anything that might slow us down, and make sure we’re aligned before we move closer to client onboarding.  
(start: 2026-02-15T10:00:00.000Z, end: 2026-02-15T10:01:25.000Z)
Ananya: From engineering, the overall flow looks solid. Slack triggers are firing reliably, execution completes end-to-end, and Notion is getting updated correctly. The confirmation message in Slack is now showing the counts and the Notion link consistently.  
(start: 2026-02-15T10:01:25.000Z, end: 2026-02-15T10:03:05.000Z)
Rahul: That’s good to hear. Kunal, anything noteworthy from the backend side that we should be aware of?  
(start: 2026-02-15T10:03:05.000Z, end: 2026-02-15T10:03:35.000Z)
Kunal: Overall stability is good. We’re handling retries safely and avoiding duplicates using meetingId and externalId. One thing that did come up is that when Notion partially succeeds, there isn’t a very clear way to communicate that nuance outside the system yet.  
(start: 2026-02-15T10:03:35.000Z, end: 2026-02-15T10:06:10.000Z)
Rahul: Yeah, that’s something we probably want to clean up sooner rather than later, especially once clients start relying on these updates.  
(start: 2026-02-15T10:06:10.000Z, end: 2026-02-15T10:06:45.000Z)
Priya: From the UI side, the demo dashboard is in good shape. It works well for walkthroughs and recordings. The only thing I’d want clarity on is the final wording we’re using across Slack, the dashboard, and any client-facing communication so everything feels consistent.  
(start: 2026-02-15T10:06:45.000Z, end: 2026-02-15T10:08:35.000Z)
Rahul: Makes sense. I’ll make sure we lock that down so we’re not sending mixed signals anywhere.  
(start: 2026-02-15T10:08:35.000Z, end: 2026-02-15T10:09:05.000Z)
Neha: From QA, most of our testing has been around the happy path and that continues to look good. One area we haven’t really pushed on yet is how Slack and Notion behave under heavier usage or rate limits. It’s probably fine for now, but worth keeping in mind.  
(start: 2026-02-15T10:09:05.000Z, end: 2026-02-15T10:10:50.000Z)
Rahul: Agreed. That’s not something we need to solve immediately, but we should track it as we move forward.  
(start: 2026-02-15T10:10:50.000Z, end: 2026-02-15T10:11:20.000Z)
Suresh: One thing I’ll reiterate is that Slack should stay lightweight. It’s doing its job as a trigger and notification surface. Anything detailed should continue to live in Notion, with Slack and email just pointing people there.  
(start: 2026-02-15T10:11:20.000Z, end: 2026-02-15T10:12:55.000Z)
Rahul: Completely aligned on that. On the client side, I’ll send a short follow-up later today summarizing where things stand and what they can expect next. I’ll reach out to ops@acmeclient.com and loop in founder@acmeclient.com so everyone’s on the same page.  
(start: 2026-02-15T10:12:55.000Z, end: 2026-02-15T10:14:05.000Z)
Ananya: Sounds good. Once that’s out, we should be in a good position to support the pilot without much friction.  
(start: 2026-02-15T10:14:05.000Z, end: 2026-02-15T10:14:40.000Z)
Rahul: Before we wrap up, just to double-check — meeting IDs are still flowing cleanly from Slack through execution and into Notion, right?  
(start: 2026-02-15T10:14:40.000Z, end: 2026-02-15T10:15:15.000Z)
Kunal: Yes, that’s all consistent. The same meetingId is available everywhere we’d need it.  
(start: 2026-02-15T10:15:15.000Z, end: 2026-02-15T10:15:45.000Z)
Rahul: Perfect. Overall this feels like we’re in a good place. Let’s keep momentum and sync again once the client has had a chance to review the follow-up. Thanks everyone.  
(start: 2026-02-15T10:15:45.000Z, end: 2026-02-15T10:17:30.000Z)

`
        : this.getTranscriptString(transcriptSegments);

      let _call_action_items_agent;
      let _call_blockers_agent;
      let _followupIntent;

      await onCallbacks.onWorkflowStarted();

      const { call_action_items_agent, call_blockers_agent } =
        await orchestratorAgent.analyzeTranscript(transcriptString);
      _call_action_items_agent = call_action_items_agent;
      _call_blockers_agent = call_blockers_agent;

      const isAnyAgentCalled = _call_action_items_agent || _call_blockers_agent;

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
        actionItemsResult?.action_items,
        blockersResult?.blockers,
        transcriptString,
      );
      await followupOrchestrate.run();
      const notionAgentPayload = this.createNotionAgentPayload(
        new_action_items,
        new_blockers,
      );

      await this.notionAgent.run(notionAgentPayload, context.meetingId);
      return await onCallbacks.onWorkflowCompleted();
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
