import { Locator, Page } from "playwright";

export class CaptionAvailabilityGate {
  async detectCaptionContainer(page: Page): Promise<Locator | null> {
    const container = page.getByRole("region", {
      name: "Captions",
    });

    const count = await container.count();
    if (count === 0) {
      return null;
    }

    return container.first();
  }

  async isCaptionsAvailable(page: Page): Promise<{
    available: boolean;
    container: Locator | null;
  }> {
    const container = await this.detectCaptionContainer(page);

    if (!container) {
      console.log(
        "[CaptionGate] Captions not available — transcript capture aborted"
      );
      return { available: false, container: null };
    }

    console.log("[CaptionGate] Captions detected — capture allowed");
    return { available: true, container };
  }
}

export default CaptionAvailabilityGate;
