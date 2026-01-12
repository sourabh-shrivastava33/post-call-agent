import { MeetingStatus, TranscriptSegment } from "../generated/prisma";
import meetingsServices from "../models/meetings/meetings.services";
import TranscriptServices from "../transcript/transcript.services";
import { ActionItemsAgentOutput } from "./agents/action__items_agents/action_items_agent_types";
import { ExecutionContext } from "./execution_orchasterate/execution_context";
import ExecutionOrchestrate from "./execution_orchasterate/execution_orchasterate";

async function startExecution(meetingId: string): Promise<void> {
  try {
    const transcriptService = new TranscriptServices(meetingId);
    const onCallbacks = {
      onWorkflowStarted: async () => {
        await meetingsServices.updateMeetingStatus({
          meetingId,
          status: MeetingStatus.WORKFLOW_STARTED,
        });
      },

      onWorkflowCompleted: async () => {
        await meetingsServices.updateMeetingStatus({
          meetingId,
          status: MeetingStatus.WORKFLOW_ENDED,
        });
      },
      onWorkflowFailed: async (failureReason: string) => {
        const failureReasonPromise = [
          meetingsServices.updateMeetingStatus({
            meetingId,
            status: MeetingStatus.FAILED,
          }),
          meetingsServices.updateMeeting({ meetingId, failureReason }),
        ];

        await Promise.all(failureReasonPromise);
      },
    };

    const transcriptSegment: TranscriptSegment[] | undefined =
      await transcriptService.getAllTranscriptSegmentByMeetingId(meetingId);

    let executionContext: ExecutionContext = {
      meetingId: meetingId,
      currentDateTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    const executionOrchestrator = new ExecutionOrchestrate();
    if (transcriptSegment && transcriptSegment.length) {
      // Starting the workflow
      // TEST
      // await meetingsServices.updateMeetingStatus({
      //   meetingId,
      //   status: "WORKFLOW_STARTED",
      // });
    }
    await executionOrchestrator.run({
      context: executionContext,
      transcriptSegments: transcriptSegment || [],
      onCallbacks,
    });
  } catch (error) {
    await meetingsServices.updateMeetingStatus({
      meetingId,
      status: "FAILED",
    });
    console.log("Error while starting to executing the Agent flow");
  }
}
export default startExecution;
