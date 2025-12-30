import { chromium, BrowserContext, Page } from "playwright";

class BrowserManager {
  private static instance: BrowserManager;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private constructor() {}

  static getInstance() {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  async getPage(): Promise<Page> {
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    const PROFILE_DIR = process.env.BOT_PROFILE_DIR || "./bot-profile";

    this.context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
      permissions: ["microphone", "camera"],
    });

    this.page = this.context.pages()[0] || (await this.context.newPage());
    return this.page;
  }
}

export default BrowserManager;
