import meetingsServices from "../models/meetings/meetings.services";
import GoogleMeetBot from "../bot/google-meet-bot/googleMeetBot";
import { MeetingStatus } from "../generated/prisma";
import TranscriptProcessor from "../transcript/transcript.controller";
import { slackLogger } from "../models/meetings/slack/slack.logger";
import {
  agentJoinedMeetingBlocks,
  executionFailedBlocks,
  executionStartedBlocks,
  meetingDetectedBlocks,
  meetingEndedBlocks,
  transcriptCaptureStartedBlocks,
} from "../models/meetings/slack/slack.utility";
class CaptureService {
  async startCapture(
    meetingUrl: string,
    meetingId: string,
    meetingBotSessionId: string,
  ) {
    try {
      const botMail = process.env.BOT_EMAIL;
      const botPassword = process.env.BOT_PASSWORD;
      const onCallbacks = {
        onJoining: async (meetingUrl: string) => {
          await meetingsServices.updateMeetingBotSession({
            meetingBotSessionId: meetingBotSessionId,
            data: {
              joinStartAt: new Date(),
            },
          });

          await slackLogger.log(
            meetingDetectedBlocks({
              meetingId: meetingId,
              meetingUrl: meetingUrl,
              triggeredBy: "",
            }), // replace when available
          );
        },
        onJoined: async () => {
          await meetingsServices.updateMeetingStatus({
            meetingId: meetingId,
            status: MeetingStatus.JOINED,
          });

          await meetingsServices.updateMeetingBotSession({
            meetingBotSessionId: meetingBotSessionId,
            data: {
              joinEndAt: new Date(),
              joinSuccess: true,
            },
          });
          await slackLogger.log(agentJoinedMeetingBlocks({ meetingId }));
        },

        onCaptureStart: async () => {
          await meetingsServices.updateMeetingStatus({
            meetingId,
            status: MeetingStatus.CAPTURING,
          });
          await slackLogger.log(
            transcriptCaptureStartedBlocks({ source: "Google Meet" }),
          );
        },

        onFailure: async (reason: string) => {
          await meetingsServices.updateMeetingStatus({
            meetingId: meetingId,
            status: MeetingStatus.FAILED,
          });

          await meetingsServices.updateMeetingBotSession({
            meetingBotSessionId: meetingBotSessionId,
            data: {
              joinEndAt: new Date(),
              joinSuccess: false,
              failureReason: reason,
            },
          });
          await slackLogger.log(executionFailedBlocks({ reason }));
        },

        onMeetingEnd: async (meetingId: string) => {
          await meetingsServices.updateMeetingStatus({
            meetingId: meetingId,
            status: MeetingStatus.CAPTURED,
          });

          await slackLogger.log(
            meetingEndedBlocks({ durationMinutes: 0 }), // replace when available
          );

          const processor = new TranscriptProcessor(meetingId);
          await processor.processTranscript();
        },
      };
      // run bot with the meeting url and meeting id
      const googleMeetBot = new GoogleMeetBot({
        botEmail: botMail!,
        botPassword: botPassword!,
        onCallbacks: onCallbacks,
        meetingId: meetingId,
      });

      googleMeetBot
        .startPolling(meetingUrl, meetingId)
        .then(() => {
          console.log("✓ Polling finished for meeting capture.");
        })
        .catch((error) => {
          meetingsServices.updateMeetingBotSession({
            meetingBotSessionId: meetingBotSessionId,
            data: {
              joinEndAt: new Date(),
              joinSuccess: false,
              failureReason: `Polling error: ${
                error instanceof Error ? error.message : JSON.stringify(error)
              }`,
            },
          });
        });
    } catch (error) {
      await meetingsServices.updateMeetingStatus({
        meetingId: meetingId,
        status: MeetingStatus.FAILED,
      });
      throw new Error(
        `Error while trying  to capture meeting: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      );
    }
  }
}

export default new CaptureService();
