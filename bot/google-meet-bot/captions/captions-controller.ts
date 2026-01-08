import { Locator, Page, ConsoleMessage } from "playwright";
import CaptionAvailabilityGate from "./caption-availability-gate";
import { CaptionObserver } from "./captions-observer";
import captionsServices from "./captions.services";
import { logger } from "../../../shared/logger";
class CaptionController {
  private captionContainer: Locator | null = null;
  gate = new CaptionAvailabilityGate();
  private consoleHandler: ((message: ConsoleMessage) => void) | null = null;
  private captionBatch: any[] = [];
  private BATCH_SIZE: number = 1;
  private observer: CaptionObserver | null = null;
  private seq_no: number = 0;
  private captureActive: boolean = true;

  async initialize(page: Page, meetingId: string) {
    try {
      const { available, container } = await this.gate.isCaptionsAvailable(
        page
      );

      if (!available || !container) {
        return false;
      }
      this.captionContainer = container;
      // Forwarder callback invoked when a caption payload arrives
      const onRawCaption = async (event: any) => {
        if (!this.captureActive) return;
        this.seq_no++;
        let eventBatchPayload = {
          meetingId: meetingId,
          speaker: event.speaker,
          text: event.text,
          observedAt: event.observedAt,
          seq_no: this.seq_no,
        };

        this.captionBatch.push(eventBatchPayload);
        if (this.captionBatch.length === this.BATCH_SIZE) {
          void this.flushCaptions();
          this.captionBatch = [];
        }
        console.log("caption->node:", event);
      };

      // Attach console listener BEFORE initializing the observer so we don't
      // miss any events emitted immediately when the observer is set up.
      this.consoleHandler = (message: ConsoleMessage) => {
        console.log(message.type(), message.text());

        if (message.type() !== "log") return;

        const text = message.text();

        if (!text.startsWith("__CAPTION_EVENT__")) return;

        const json = text.replace("__CAPTION_EVENT__", "").trim();
        try {
          const payload = JSON.parse(json);
          onRawCaption(payload);
        } catch (err) {
          console.error("Failed to parse caption payload:", err, json);
        }
      };

      page.on("console", this.consoleHandler);

      const captionObserver = new CaptionObserver(
        page,
        container,
        onRawCaption
      );
      await captionObserver.initialize();
      this.observer = captionObserver;
      return true;
    } catch (error) {
      return false;
    }
  }

  async flushCaptions() {
    if (this.captionBatch.length == 0) return;
    try {
      if (this.captionBatch.length <= this.BATCH_SIZE) {
        await captionsServices.createRawCaptionEventBatch(this.captionBatch);
      }
    } catch (error) {
      logger.log(
        `Error while entering raw caption data events, Error: ${JSON.stringify(
          error
        )}`
      );
    }
  }

  async dispose(page: Page) {
    if (this.consoleHandler) {
      page.off("console", this.consoleHandler);
      this.consoleHandler = null;
    }
    this.captureActive = false;
    await this.flushCaptions();
    await this.observer?.cleanup();
  }
}

export default new CaptionController();
