import captionsServices from "../bot/google-meet-bot/captions/captions.services";
import { CaptionEvent } from "../generated/prisma";
import AggregateProcessor from "./aggregate_procesesor";
import TranscriptServices from "./transcript.services";

class TranscriptProcessor {
  private rawCaptionData: CaptionEvent[] | [] = [];
  private meetingId: string;
  private transcriptService: TranscriptServices;
  constructor(meetingId: string) {
    this.meetingId = meetingId;
    this.transcriptService = new TranscriptServices(this.meetingId);
  }
  async processTranscript() {
    try {
      this.rawCaptionData = await this.fetchRawEventData();
      // Resolving speakers
      const resolvedSpeakerRawData = this.resolveSpeaker(this.rawCaptionData);

      // Aggregating the raw event for finalized text
      const aggregateProcessor = new AggregateProcessor(
        resolvedSpeakerRawData,
        this.meetingId
      );

      aggregateProcessor.ingest();

      const aggregatedData = aggregateProcessor.flush();
      if (aggregatedData && aggregatedData.length) {
        this.transcriptService.createTranscriptSegment(aggregatedData);
      }
    } catch (error) {
      throw new Error("Error while processing raw event data");
    }
  }

  resolveSpeaker(rawData: CaptionEvent[]) {
    if (rawData.length === 0) return [];

    try {
      let lastSpeaker = "";
      return rawData.map((rd) => {
        if (!rd.speakerLabel) {
          return {
            ...rd,
            speakerLabel: lastSpeaker,
          };
        } else {
          lastSpeaker = rd.speakerLabel;
          return rd;
        }
      });
    } catch (error) {
      throw new Error("Speaker resolution failed");
    }
  }

  async fetchRawEventData(): Promise<CaptionEvent[]> {
    return await captionsServices.fetchAllRawCaptionDataByMeetingId(
      this.meetingId
    );
  }
}

export default TranscriptProcessor;
