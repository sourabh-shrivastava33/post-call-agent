import { Locator, Page } from "playwright";

export type RawCaptionEvent = {
  speaker: string;
  text: string;
  observedAt: Date;
};

export class CaptionObserver {
  private page: Page;
  private captionContainer: Locator;
  private onRawCaption: (event: RawCaptionEvent) => void;
  constructor(
    page: Page,
    captionContainer: Locator,
    onRawCaption: (event: RawCaptionEvent) => void
  ) {
    this.page = page;
    this.captionContainer = captionContainer;
    this.onRawCaption = onRawCaption;
  }

  async initialize() {
    try {
      const elementHandle = await this.captionContainer.elementHandle();
      if (!elementHandle) {
        throw new Error("Caption container is not available");
      }

      await this.cleanup();
      await this.setupObserver();
    } catch (error) {
      throw new Error(
        `Caption Observer failed,Error:${
          error instanceof Error ? error.message : JSON.stringify(error)
        }  `
      );
    }
  }
  async setupObserver() {
    console.log("Observer setup started");

    // Use evaluate with plain JavaScript string to avoid TypeScript transpilation
    await this.page.evaluate(`
      (() => {
        const captionRegion = document.querySelector(
          '[role="region"][aria-label="Captions"]'
        );

        if (!captionRegion) {
          console.error("❌ Caption region not found!");
          return;
        }

        let lastCaptionText = "";

       
        const pollCaptions = () => {
         
          
          // Query caption lines by their container class
          const captionLines = captionRegion.querySelectorAll("div.nMcdL.bj4p3b");

          if (captionLines.length === 0) {
           
              console.log("❌ NO CAPTION LINES");
            return;
          }

      


          const currentText = Array.from(captionLines)
            .map((line) => {

              const textEl = line.querySelector(".ygicle");
              
              return textEl?.textContent?.trim();
            })
            .filter(Boolean)
            .join("|");

       

          if (currentText !== lastCaptionText && currentText) {
            console.log("🔄 CHANGE DETECTED! Extracting speaker and text...");
            lastCaptionText = currentText;

            captionLines.forEach((line, idx) => {
              // Get speaker from span.NWpY1d
              const speakerEl = line.querySelector(".NWpY1d");
              const speaker = speakerEl?.textContent?.trim() || "";
              console.log("  Speaker element idx", idx, ":", !!speakerEl, "Value:", speaker);
              
              // Get caption text from .ygicle div
              const textEl = line.querySelector(".ygicle");
              const text = textEl?.textContent?.trim() || "";
              console.log("  Text element idx", idx, ":", !!textEl, "Value:", text?.substring(0, 50));

              if (text) {
                console.log(
                  "__CAPTION_EVENT__" +
                    JSON.stringify({
                      speaker,
                      text,
                      observedAt: Date.now(),
                    })
                );
              }
            });
          }
        };

        setInterval(pollCaptions, 500);

        const observer = new MutationObserver((mutations) => {
          console.log("🔔 MUTATION FIRED!");
          pollCaptions();
        });

        observer.observe(captionRegion, {
          childList: true,
          attributes: true,
          characterData: true,
          subtree: true,
        });

        window.__captionObserver = observer;
        console.log("✅ CAPTION_OBSERVER_ATTACHED + POLLING ACTIVE");
      })();
    `);
  }

  async cleanup() {
    await this.page.evaluate(`
      (() => {
       console.log("__CAPTION_CAPTURE_ENDS__")
        window.__captionObserver?.disconnect?.();
        delete window.__captionObserver;
      })();
    `);
  }
}
