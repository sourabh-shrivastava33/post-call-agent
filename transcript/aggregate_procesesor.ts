import {
  CaptionEvent,
  SourceType,
  TranscriptSegment,
} from "../generated/prisma";

interface AggregateSegment {
  meetingId: string;
  endTime: Date;
  source: string;
  startTime: Date;
  text: string;
  speaker: string;
}

class AggregateProcessor {
  private currentSegment: CaptionEvent | null = null;
  private aggregateSegment: AggregateSegment[] = [];
  private eventRawData: CaptionEvent[];
  private meetingId: string;
  constructor(eventData: CaptionEvent[], meetingId: string) {
    this.eventRawData = eventData;
    this.meetingId = meetingId;
  }

  ingest() {
    this.eventRawData.forEach((d: CaptionEvent) => {
      // if no current segment
      if (!this.currentSegment) {
        this.startNewSegment(d);
        return;
      }
      // speaker changes
      if (this.currentSegment?.speakerLabel !== d.speakerLabel) {
        // finalize this segment
        this.finalizeSegment(d.createdAt);
        return;
      } else {
        this.currentSegment.rawText = d.rawText;
        return;
      }
    });
  }

  startNewSegment(event: CaptionEvent) {
    this.currentSegment = event;
  }

  finalizeSegment(endDate: Date) {
    this.aggregateSegment.push({
      meetingId: this.meetingId,
      endTime: endDate,
      source: SourceType.CAPTION,
      startTime: this.currentSegment!.observedAt,
      speaker: this.currentSegment!.speakerLabel || "",
      text: this.currentSegment!.rawText,
    });

    this.currentSegment = null;
  }

  flush() {
    if (!this.currentSegment) return;
    this.finalizeSegment(new Date());
    return this.aggregateSegment;
  }
}

export default AggregateProcessor;
