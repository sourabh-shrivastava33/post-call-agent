import { ExecutionContext } from "./execution_context";
import { logger } from "../../shared/logger";
import OrchestratorAgent from "../agents/orchestrator_agent";
import { TranscriptSegment } from "../../generated/prisma";
import ActionItemsAgent from "../agents/action__items_agents";

import BlockersAgent from "../agents/blocker_items_agent";

import ExecutionOrchestrateServices from "./excution_orchasterator.services";
import ActionItemsAgentConstants from "../agents/action__items_agents/constants";
import BlockerItemsAgentConstants from "../agents/blocker_items_agent/contants";
import FollowUpOrchestrator from "../followup_orchestrate";

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
  constructor() {
    this.orchestrator = new OrchestratorAgent();
    this.actionItemsAgent = new ActionItemsAgent();
    this.blockersAgent = new BlockersAgent();
  }
  async run({
    context,
    transcriptSegments,
    onCallbacks,
  }: OrchestratorRunParams) {
    try {
      logger.log(
        `Execution started for the meeting with as ID ${context.meetingId}`
      );

      const orchestratorAgent = this.orchestrator;

      // const transcriptString = this.getTranscriptString(transcriptSegments);

      const {
        call_action_items_agent,
        call_blockers_agent,
        call_followup_agent,
        followupIntent,
        to,
        from,
      } = await orchestratorAgent.analyzeTranscript(testString);
      const isAnyAgentCalled =
        call_action_items_agent ||
        call_blockers_agent ||
        (call_followup_agent && followupIntent);

      if (!isAnyAgentCalled) return;
      let agentRunPromise = [];
      if (call_action_items_agent)
        agentRunPromise.push(
          this.actionItemsAgent.runExecutionPipeline(testString, context)
        );
      if (call_blockers_agent)
        agentRunPromise.push(
          this.blockersAgent.runExecutionPipeline(testString, context)
        );

      const [actionItemsResult, blockersResult] = await Promise.all(
        agentRunPromise
      );
      let persistObj: Record<string, any> = {};
      if (
        (actionItemsResult?.action_items.add.length ||
          actionItemsResult?.action_items.update.length) &&
        actionItemsResult.confidence >=
          ActionItemsAgentConstants.confidenceThreshold
      ) {
        persistObj["actionItems"] = actionItemsResult.action_items;
      }
      if (
        (blockersResult?.blockers.add.length ||
          blockersResult?.blockers.update.length) &&
        blockersResult.confidence >=
          BlockerItemsAgentConstants.confidenceThreshold
      ) {
        persistObj["blockers"] = blockersResult.blockers;
      }

      this.executionServices = new ExecutionOrchestrateServices(
        context.meetingId
      );

      await this.executionServices.persistExecutionResults(persistObj);
      const followupOrchestrate = new FollowUpOrchestrator(
        actionItemsResult.action_items,
        blockersResult.blockers,
        followupIntent
      );
      await followupOrchestrate.run();
    } catch (error) {
      const failureReason =
        error instanceof Error ? error.message : JSON.stringify(error);
      onCallbacks?.onWorkflowFailed!(failureReason);
      console.log(error);
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
}

export default ExecutionOrchestrate;

let testString = `Alex (Agency – Senior Account Director): Thanks everyone for joining. Today’s goal is to review Q1 pipeline performance, confirm next steps, and align on follow-ups before finance decisions are finalized.

Rachel (Client – CMO): Thanks Alex. Before we proceed, I want to be clear — leadership expects a written follow-up after this call with concrete next steps.

Daniel (Agency – Growth Strategist): Understood. At a high level, pipeline volume is up 20% quarter over quarter, but win rate has dropped from 22% to 15%.

Rachel (Client – CMO): That drop is concerning. I’ll need a follow-up explaining what actions we’re taking to improve revenue efficiency.

Mike (Client – Head of Sales): From sales’ side, lead quality is inconsistent, especially from paid social. That’s blocking my team’s ability to close deals.

Sophia (Agency – Paid Media Lead): That’s fair. Meta campaigns are currently driving low-intent traffic due to audience expansion changes.

Mike (Client – Head of Sales): Until that’s fixed, SDR productivity will remain a blocker for us.

Alex (Agency – Senior Account Director): Agreed. Action item on our side — tighten ICP targeting across paid social and pause low-intent Meta campaigns starting this week. Sophia will own execution.

Sophia (Agency – Paid Media Lead): Confirmed. I’ll implement those changes by Wednesday.

Rachel (Client – CMO): Good. I also want a follow-up that shows how tightening ICP impacts forecasted revenue, not just lead volume.

Daniel (Agency – Growth Strategist): We’ll update the revenue forecast and include projected impact on pipeline and closed-won deals.

Alex (Agency – Senior Account Director): Noted as an action item — revised revenue-based forecast by Friday.

Rachel (Client – CMO): Another blocker is attribution. Finance is questioning whether paid media influences enterprise deals, and we don’t have clean multi-touch attribution.

Sophia (Agency – Paid Media Lead): Correct. HubSpot and Salesforce multi-touch attribution is not fully implemented yet.

Mike (Client – Head of Sales): Until attribution is fixed, budget approvals are at risk.

Alex (Agency – Senior Account Director): Action item — we’ll audit the current attribution setup and document what’s missing to support multi-touch reporting.

Rachel (Client – CMO): I’ll need that audit before my exec meeting next week.

Rachel (Client – CMO): Please follow up with me by email after this call summarizing the agreed actions, blockers, and next steps.

Rachel (Client – CMO): Send the follow-up to rachel@client.com today so I can review it with finance.

Rachel (Client – CMO): One more question for the follow-up — can you confirm whether tightening ICP will reduce demo no-show rates?

Alex (Agency – Senior Account Director): We’ll analyze historical data and include that clarification in the follow-up.

Alex (Agency – Senior Account Director): Thanks everyone. We’ll proceed on the action items and send the follow-up as requested.
`;
