import { prisma } from "../../../config/prisma";
import {
  CaptionEvent,
  SourceType,
  TranscriptSource,
} from "../../../generated/prisma";

interface EventInterface {
  meetingId: string;
  seq_no: number;
  speaker: string;
  text: string;
  observedAt: Date;
}
class CaptionServices {
  async createRawCaptionEventBatch(event: EventInterface[]) {
    const eventBatchPayload = event.map((e) => ({
      meetingId: e.meetingId,
      speakerLabel: e.speaker,
      rawText: e.text,
      observedAt: e.observedAt,
      source: TranscriptSource.CAPTIONS,
      sequenceNumber: e.seq_no,
    }));
    try {
      await prisma.captionEvent.createMany({
        data: eventBatchPayload,
        skipDuplicates: true,
      });
    } catch (error) {
      console.log("Error creating the raw caption event");
      throw new Error(
        error instanceof Error
          ? error.message
          : "Error while batch updating the raw caption event"
      );
    }
  }

  async fetchAllRawCaptionDataByMeetingId(
    meetingId: string
  ): Promise<CaptionEvent[]> {
    try {
      const rawCaptionsData = await prisma.captionEvent.findMany({
        where: { meetingId: meetingId },
        orderBy: {
          sequenceNumber: "asc",
        },
      });
      return rawCaptionsData;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : JSON.stringify(error)
      );
    }
  }
}

export default new CaptionServices();
