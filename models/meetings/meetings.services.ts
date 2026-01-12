import captureService from "../../capture/capture.service.js";
import { prisma } from "../../config/prisma";
import { MeetingStatus } from "../../generated/prisma";

class MeetingsServices {
  async createMeeting(meetingData: { meetingUrl: string; startTime: Date }) {
    try {
      const meeting = await prisma.meeting.create({
        data: {
          meetingUrl: meetingData.meetingUrl,
          startTime: meetingData.startTime,
        },
      });
      return meeting;
    } catch (error) {
      throw new Error(
        "Error creating meeting: " +
          (error instanceof Error ? error.message : JSON.stringify(error))
      );
    }
  }
  async updateMeetingStatus(meetingData: {
    meetingId: string;
    status: MeetingStatus;
  }) {
    try {
      const meeting = await prisma.meeting.update({
        where: { id: meetingData.meetingId },
        data: {
          status: meetingData.status,
        },
      });
      return meeting;
    } catch (error) {
      throw new Error(
        "Error creating meeting: " +
          (error instanceof Error ? error.message : JSON.stringify(error))
      );
    }
  }

  async updateMeeting(updateMeetingData: updateMeetingData) {
    try {
      await prisma.meeting.update({
        where: { id: updateMeetingData.meetingId },
        data: { failureReason: updateMeetingData.failureReason },
      });
    } catch (error) {
      throw new Error(
        `Error updating meeting: Error, ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`
      );
    }
  }
  async createMeetingBotSession(meetingBotSessionData: {
    meetingId: string;
    browserSessionId: string;
  }) {
    try {
      const meetingBotSession = await prisma.meetingBotSession.create({
        data: {
          meetingId: meetingBotSessionData.meetingId,
          browserSessionId: meetingBotSessionData?.browserSessionId || "",
        },
      });
      return meetingBotSession.id;
    } catch (error) {
      throw new Error(
        `Error creating meeting bot session: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`
      );
    }
  }

  async updateMeetingBotSession(meetingBotSessionData: {
    meetingBotSessionId: string;
    data: {
      joinStartAt?: Date;
      joinEndAt?: Date;
      joinSuccess?: boolean;
      failureReason?: string;
    };
  }) {
    try {
      await prisma.meetingBotSession.update({
        where: { id: meetingBotSessionData.meetingBotSessionId },
        data: {
          ...meetingBotSessionData.data,
        },
      });
    } catch (error) {
      throw new Error(
        `Error updating meeting bot session: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`
      );
    }
  }

  async startMeeting(meetingData: { meetingUrl: string; startTime: Date }) {
    try {
      const meeting = await this.createMeeting({
        meetingUrl: meetingData.meetingUrl,
        startTime: meetingData.startTime,
      });
      const meetingId = meeting.id;
      const browserSessionId = `session-${meetingId}-${Date.now()}`;

      const meetingBotSessionId = await this.createMeetingBotSession({
        meetingId: meetingId,
        browserSessionId: browserSessionId,
      });

      await this.updateMeetingStatus({
        meetingId: meetingId,
        status: MeetingStatus.SCHEDULED,
      });

      captureService.startCapture(
        meetingData.meetingUrl,
        meetingId,
        meetingBotSessionId
      );
      return meetingId;
    } catch (error) {
      throw new Error(
        `Error starting meeting: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`
      );
    }
  }
}

interface updateMeetingData {
  failureReason: string;
  meetingId: string;
}
export default new MeetingsServices();
