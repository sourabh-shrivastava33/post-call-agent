import { withTrace } from "@openai/agents";
import { ExecutionContext } from "./execution_context";
import { logger } from "../../shared/logger";
import OrchestratorAgent from "../agents/orchestrator_agent";
import { SourceType, TranscriptSegment } from "../../generated/prisma";
import ActionItemsAgent from "../agents/action__items_agents";
import { ActionItemAdd } from "../agents/action__items_agents/action_items_agent_types";
import BlockersAgent from "../agents/blocker_items_agent";
import {
  Blocker,
  BlockersAgentOutput,
} from "../agents/blocker_items_agent/blocker_items_agent.types";

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
  private actionItems: ActionItemAdd[] = [];
  private blockers: Blocker[] = [];
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

      let testData: TranscriptSegment[] = [
        {
          id: "seg_1",
          meetingId: "meeting_123",
          startTime: new Date("2026-01-03T10:00:05.000Z"),
          endTime: new Date("2026-01-03T10:00:12.000Z"),
          speaker: "Amit (PM)",
          text: "Alright, let's start. The main goal today is to finalize the onboarding flow for the new agency dashboard.",
          source: SourceType.CAPTION,
          createdAt: new Date("2026-01-03T10:00:12.000Z"),
          updatedAt: new Date("2026-01-03T10:00:12.000Z"),
        },
        {
          id: "seg_2",
          meetingId: "meeting_123",
          startTime: new Date("2026-01-03T10:00:15.000Z"),
          endTime: new Date("2026-01-03T10:00:22.000Z"),
          speaker: "Riya (Design)",
          text: "From a design perspective, we are still waiting on the final copy for the empty states.",
          source: SourceType.CAPTION,
          createdAt: new Date("2026-01-03T10:00:22.000Z"),
          updatedAt: new Date("2026-01-03T10:00:22.000Z"),
        },
        {
          id: "seg_3",
          meetingId: "meeting_123",
          startTime: new Date("2026-01-03T10:00:25.000Z"),
          endTime: new Date("2026-01-03T10:00:35.000Z"),
          speaker: "Sourabh (Backend)",
          text: "Backend APIs for user creation and permissions are already done. The blocker is that role definitions are still not finalized.",
          source: SourceType.CAPTION,
          createdAt: new Date("2026-01-03T10:00:35.000Z"),
          updatedAt: new Date("2026-01-03T10:00:35.000Z"),
        },
        {
          id: "seg_4",
          meetingId: "meeting_123",
          startTime: new Date("2026-01-03T10:00:38.000Z"),
          endTime: new Date("2026-01-03T10:00:46.000Z"),
          speaker: "Amit (PM)",
          text: "Okay, action item for me is to finalize the role definitions by tomorrow end of day.",
          source: SourceType.CAPTION,
          createdAt: new Date("2026-01-03T10:00:46.000Z"),
          updatedAt: new Date("2026-01-03T10:00:46.000Z"),
        },
        {
          id: "seg_5",
          meetingId: "meeting_123",
          startTime: new Date("2026-01-03T10:00:50.000Z"),
          endTime: new Date("2026-01-03T10:00:58.000Z"),
          speaker: "Riya (Design)",
          text: "Once roles are finalized, I can finish the empty state designs on the same day.",
          source: SourceType.CAPTION,
          createdAt: new Date("2026-01-03T10:00:58.000Z"),
          updatedAt: new Date("2026-01-03T10:00:58.000Z"),
        },
        {
          id: "seg_6",
          meetingId: "meeting_123",
          startTime: new Date("2026-01-03T10:01:02.000Z"),
          endTime: new Date("2026-01-03T10:01:10.000Z"),
          speaker: "Amit (PM)",
          text: "One more thing, QA has not tested the new onboarding flow yet, so this might delay the release.",
          source: SourceType.CAPTION,
          createdAt: new Date("2026-01-03T10:01:10.000Z"),
          updatedAt: new Date("2026-01-03T10:01:10.000Z"),
        },
        {
          id: "seg_7",
          meetingId: "meeting_123",
          startTime: new Date("2026-01-03T10:01:13.000Z"),
          endTime: new Date("2026-01-03T10:01:20.000Z"),
          speaker: "Sourabh (Backend)",
          text: "Yes, QA testing is a blocker. Without that, we should not push this to production.",
          source: SourceType.CAPTION,
          createdAt: new Date("2026-01-03T10:01:20.000Z"),
          updatedAt: new Date("2026-01-03T10:01:20.000Z"),
        },
        {
          id: "seg_8",
          meetingId: "meeting_123",
          startTime: new Date("2026-01-03T10:01:25.000Z"),
          endTime: new Date("2026-01-03T10:01:32.000Z"),
          speaker: "Amit (PM)",
          text: "Alright, let's tentatively target Friday for release assuming QA clears everything.",
          source: SourceType.CAPTION,
          createdAt: new Date("2026-01-03T10:01:32.000Z"),
          updatedAt: new Date("2026-01-03T10:01:32.000Z"),
        },
      ];

      const transcriptString = this.getTranscriptString(testData);

      const {
        call_action_items_agent,
        call_blockers_agent,
        call_summary_agent,
      } = await orchestratorAgent.analyzeTranscript(transcriptString);
      const isAnyAgentCalled = call_action_items_agent || call_blockers_agent;

      if (!isAnyAgentCalled) return;
      let agentRunPromise = [];
      if (call_action_items_agent)
        agentRunPromise.push(
          this.actionItemsAgent.analyzeTranscript(transcriptString, context)
        );
      if (call_blockers_agent)
        agentRunPromise.push(
          this.blockersAgent.analyzeTranscript(transcriptString, context)
        );

      const [actionItemsResult, blockersResult] = await Promise.all(
        agentRunPromise
      );

      // Check if ReconciliationAgent was called via handoff
      const reconciliationOutput =
        this.actionItemsAgent.getReconciliationOutput?.();

      console.log({
        actionItemsResult,
        blockersResult,
        ...(reconciliationOutput && { reconciliationOutput }),
      });
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
      return (acc = `${acc} ${curr.speaker}: ${curr.text}`);
    }, "");
  }
}

export default ExecutionOrchestrate;

// test data for local testing
// let testData: TranscriptSegment[] = [
//   {
//     id: "seg_1",
//     meetingId: "meeting_123",
//     startTime: new Date("2026-01-03T10:00:05.000Z"),
//     endTime: new Date("2026-01-03T10:00:12.000Z"),
//     speaker: "Amit (PM)",
//     text: "Alright, let's start. The main goal today is to finalize the onboarding flow for the new agency dashboard.",
//     source: SourceType.CAPTION,
//     createdAt: new Date("2026-01-03T10:00:12.000Z"),
//     updatedAt: new Date("2026-01-03T10:00:12.000Z"),
//   },
//   {
//     id: "seg_2",
//     meetingId: "meeting_123",
//     startTime: new Date("2026-01-03T10:00:15.000Z"),
//     endTime: new Date("2026-01-03T10:00:22.000Z"),
//     speaker: "Riya (Design)",
//     text: "From a design perspective, we are still waiting on the final copy for the empty states.",
//     source: SourceType.CAPTION,
//     createdAt: new Date("2026-01-03T10:00:22.000Z"),
//     updatedAt: new Date("2026-01-03T10:00:22.000Z"),
//   },
//   {
//     id: "seg_3",
//     meetingId: "meeting_123",
//     startTime: new Date("2026-01-03T10:00:25.000Z"),
//     endTime: new Date("2026-01-03T10:00:35.000Z"),
//     speaker: "Sourabh (Backend)",
//     text: "Backend APIs for user creation and permissions are already done. The blocker is that role definitions are still not finalized.",
//     source: SourceType.CAPTION,
//     createdAt: new Date("2026-01-03T10:00:35.000Z"),
//     updatedAt: new Date("2026-01-03T10:00:35.000Z"),
//   },
//   {
//     id: "seg_4",
//     meetingId: "meeting_123",
//     startTime: new Date("2026-01-03T10:00:38.000Z"),
//     endTime: new Date("2026-01-03T10:00:46.000Z"),
//     speaker: "Amit (PM)",
//     text: "Okay, action item for me is to finalize the role definitions by tomorrow end of day.",
//     source: SourceType.CAPTION,
//     createdAt: new Date("2026-01-03T10:00:46.000Z"),
//     updatedAt: new Date("2026-01-03T10:00:46.000Z"),
//   },
//   {
//     id: "seg_5",
//     meetingId: "meeting_123",
//     startTime: new Date("2026-01-03T10:00:50.000Z"),
//     endTime: new Date("2026-01-03T10:00:58.000Z"),
//     speaker: "Riya (Design)",
//     text: "Once roles are finalized, I can finish the empty state designs on the same day.",
//     source: SourceType.CAPTION,
//     createdAt: new Date("2026-01-03T10:00:58.000Z"),
//     updatedAt: new Date("2026-01-03T10:00:58.000Z"),
//   },
//   {
//     id: "seg_6",
//     meetingId: "meeting_123",
//     startTime: new Date("2026-01-03T10:01:02.000Z"),
//     endTime: new Date("2026-01-03T10:01:10.000Z"),
//     speaker: "Amit (PM)",
//     text: "One more thing, QA has not tested the new onboarding flow yet, so this might delay the release.",
//     source: SourceType.CAPTION,
//     createdAt: new Date("2026-01-03T10:01:10.000Z"),
//     updatedAt: new Date("2026-01-03T10:01:10.000Z"),
//   },
//   {
//     id: "seg_7",
//     meetingId: "meeting_123",
//     startTime: new Date("2026-01-03T10:01:13.000Z"),
//     endTime: new Date("2026-01-03T10:01:20.000Z"),
//     speaker: "Sourabh (Backend)",
//     text: "Yes, QA testing is a blocker. Without that, we should not push this to production.",
//     source: SourceType.CAPTION,
//     createdAt: new Date("2026-01-03T10:01:20.000Z"),
//     updatedAt: new Date("2026-01-03T10:01:20.000Z"),
//   },
//   {
//     id: "seg_8",
//     meetingId: "meeting_123",
//     startTime: new Date("2026-01-03T10:01:25.000Z"),
//     endTime: new Date("2026-01-03T10:01:32.000Z"),
//     speaker: "Amit (PM)",
//     text: "Alright, let's tentatively target Friday for release assuming QA clears everything.",
//     source: SourceType.CAPTION,
//     createdAt: new Date("2026-01-03T10:01:32.000Z"),
//     updatedAt: new Date("2026-01-03T10:01:32.000Z"),
//   },
// ];
