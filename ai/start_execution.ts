import "dotenv/config";

import { MeetingStatus, TranscriptSegment } from "../generated/prisma";
import meetingsServices from "../models/meetings/meetings.services";
import { slackLogger } from "../models/meetings/slack/slack.logger";
import {
  executionStartedBlocks,
  executionFailedBlocks,
} from "../models/meetings/slack/slack.utility";
import TranscriptServices from "../transcript/transcript.services";
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
        await slackLogger.log(executionStartedBlocks());
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
        await slackLogger.log(executionFailedBlocks({ reason: failureReason }));
        await Promise.all(failureReasonPromise);
      },
    };

    const transcriptSegment: TranscriptSegment[] | undefined =
      await transcriptService.getAllTranscriptSegmentByMeetingId(meetingId);

    if (transcriptSegment && transcriptSegment.length) {
      let executionContext: ExecutionContext = {
        meetingId: meetingId,
        currentDateTime: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const executionOrchestrator = new ExecutionOrchestrate();

      await meetingsServices.updateMeetingStatus({
        meetingId,
        status: "WORKFLOW_STARTED",
      });

      try {
        await executionOrchestrator.run({
          context: executionContext,
          transcriptSegments: transcriptSegment || [],
          onCallbacks,
        });
      } catch (error) {
        throw new Error(JSON.stringify(error));
      }
    }
  } catch (error) {
    await meetingsServices.updateMeetingStatus({
      meetingId,
      status: "FAILED",
    });
    console.log("Error while starting to executing the Agent flow");
  }
}
export default startExecution;
