import { prisma } from "../config/prisma";
import { SourceType } from "../generated/prisma";

class TranscriptServices {
  private meetingId: string;
  constructor(meetingId: string) {
    this.meetingId = meetingId;
  }

  async createTranscriptSegment(
    transcriptSegmentData: {
      startTime: Date;

      endTime: Date;

      text: string;
      speaker: string;
    }[]
  ) {
    const transcriptSegmentPayload = transcriptSegmentData.map((tsd) => ({
      meetingId: this.meetingId,
      startTime: tsd.startTime,
      endTime: tsd.endTime,
      text: tsd.text,
      speaker: tsd.speaker,
      source: SourceType.CAPTION,
    }));
    try {
      const transcriptSegments = await prisma.transcriptSegment.createMany({
        data: transcriptSegmentPayload,
      });
      return transcriptSegments;
    } catch (error) {
      throw new Error(
        `Transcript saving failed with and error, Error:${JSON.stringify(
          error
        )}`
      );
    }
  }

  async getAllTranscriptSegmentByMeetingId(meetingId: string) {
    try {
      const allTranscriptSegments = await prisma.transcriptSegment.findMany({
        where: { meetingId: meetingId },
        orderBy: {
          startTime: "asc",
        },
      });
      return allTranscriptSegments;
    } catch (error) {
      console.log("Error while fetching all transcripts segments");
    }
  }
}
export default TranscriptServices;
