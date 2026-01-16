import {
  MeetingStatus,
  SourceType,
  TranscriptSegment,
} from "../generated/prisma";
import meetingsServices from "../models/meetings/meetings.services";
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

    // const transcriptSegment: TranscriptSegment[] | undefined =
    //   await transcriptService.getAllTranscriptSegmentByMeetingId(meetingId);

    const transcriptSegment = [
      {
        id: "seg_1",
        meetingId: "meeting_mkt_456",
        startTime: new Date("2026-01-05T09:30:05.000Z"),
        endTime: new Date("2026-01-05T09:30:15.000Z"),
        speaker: "Neha (Account Manager)",
        text: "Alright everyone, the goal of this call is to align on the Q1 performance campaign for the Acme Corp account.",
        source: SourceType.CAPTION,
        createdAt: new Date("2026-01-05T09:30:15.000Z"),
        updatedAt: new Date("2026-01-05T09:30:15.000Z"),
      },
      {
        id: "seg_2",
        meetingId: "meeting_mkt_456",
        startTime: new Date("2026-01-05T09:30:18.000Z"),
        endTime: new Date("2026-01-05T09:30:28.000Z"),
        speaker: "Rahul (Paid Media)",
        text: "The Google Ads structure is ready, but we are still waiting for final creatives from the design team.",
        source: SourceType.CAPTION,
        createdAt: new Date("2026-01-05T09:30:28.000Z"),
        updatedAt: new Date("2026-01-05T09:30:28.000Z"),
      },
      {
        id: "seg_3",
        meetingId: "meeting_mkt_456",
        startTime: new Date("2026-01-05T09:30:32.000Z"),
        endTime: new Date("2026-01-05T09:30:45.000Z"),
        speaker: "Pooja (Design Lead)",
        text: "Yes, that's a blocker from our side. We haven't received the final messaging guidelines from the client yet.",
        source: SourceType.CAPTION,
        createdAt: new Date("2026-01-05T09:30:45.000Z"),
        updatedAt: new Date("2026-01-05T09:30:45.000Z"),
      },
      {
        id: "seg_4",
        meetingId: "meeting_mkt_456",
        startTime: new Date("2026-01-05T09:30:48.000Z"),
        endTime: new Date("2026-01-05T09:31:00.000Z"),
        speaker: "Neha (Account Manager)",
        text: "Action item for me — I’ll follow up with the client today and ask them to share the final messaging guidelines.",
        source: SourceType.CAPTION,
        createdAt: new Date("2026-01-05T09:31:00.000Z"),
        updatedAt: new Date("2026-01-05T09:31:00.000Z"),
      },
      {
        id: "seg_5",
        meetingId: "meeting_mkt_456",
        startTime: new Date("2026-01-05T09:31:05.000Z"),
        endTime: new Date("2026-01-05T09:31:15.000Z"),
        speaker: "Neha (Account Manager)",
        text: "Once I get that, Pooja, you can finalize the creatives by Wednesday end of day.",
        source: SourceType.CAPTION,
        createdAt: new Date("2026-01-05T09:31:15.000Z"),
        updatedAt: new Date("2026-01-05T09:31:15.000Z"),
      },
      {
        id: "seg_6",
        meetingId: "meeting_mkt_456",
        startTime: new Date("2026-01-05T09:31:18.000Z"),
        endTime: new Date("2026-01-05T09:31:30.000Z"),
        speaker: "Rahul (Paid Media)",
        text: "If creatives are delayed beyond Wednesday, the campaign launch will slip and we won’t be able to go live on Friday.",
        source: SourceType.CAPTION,
        createdAt: new Date("2026-01-05T09:31:30.000Z"),
        updatedAt: new Date("2026-01-05T09:31:30.000Z"),
      },
      {
        id: "seg_7",
        meetingId: "meeting_mkt_456",
        startTime: new Date("2026-01-05T09:31:34.000Z"),
        endTime: new Date("2026-01-05T09:31:45.000Z"),
        speaker: "Neha (Account Manager)",
        text: "Also, please send a quick recap of today’s discussion to the client at marketing@acmecorp.com.",
        source: SourceType.CAPTION,
        createdAt: new Date("2026-01-05T09:31:45.000Z"),
        updatedAt: new Date("2026-01-05T09:31:45.000Z"),
      },
      {
        id: "seg_8",
        meetingId: "meeting_mkt_456",
        startTime: new Date("2026-01-05T09:31:48.000Z"),
        endTime: new Date("2026-01-05T09:31:58.000Z"),
        speaker: "Pooja (Design Lead)",
        text: "Sounds good. Once the guidelines come in, we’ll prioritize this over other internal work.",
        source: SourceType.CAPTION,
        createdAt: new Date("2026-01-05T09:31:58.000Z"),
        updatedAt: new Date("2026-01-05T09:31:58.000Z"),
      },
    ];
    if (transcriptSegment && transcriptSegment.length) {
      let executionContext: ExecutionContext = {
        meetingId: meetingId,
        currentDateTime: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const executionOrchestrator = new ExecutionOrchestrate();
      // Starting the workflow
      // TEST
      await meetingsServices.updateMeetingStatus({
        meetingId,
        status: "WORKFLOW_STARTED",
      });
      await executionOrchestrator.run({
        context: executionContext,
        transcriptSegments: transcriptSegment || [],
        onCallbacks,
      });
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
