import BrowserManager from "./browserManagement";
import { Page } from "playwright";
import captionsController from "./captions/captions-controller";
import { CaptionObserver } from "./captions/captions-observer";
interface GoogleMeetBotParams {
  botEmail: string;
  botPassword: string;
  onCallbacks?: {
    onJoining?: () => void;
    onJoined?: () => void;
    onCaptureStart?: () => void;
    onMeetingEnd?: (meetingId: string) => Promise<void>;

    onFailure?: (reason: string) => void;
  };
}

class GoogleMeetBot {
  private page: Page | null = null;
  private hasJoined = false;
  private hasEnded = false;

  constructor(private params: GoogleMeetBotParams) {}

  async initialize() {
    const manager = BrowserManager.getInstance();
    this.page = await manager.getPage();
  }

  /**
   * Login ONLY if Google redirects to accounts.google.com
   */
  async ensureLoggedIn() {
    if (!this.page) return;

    const url = this.page.url();
    if (!url.includes("accounts.google.com")) {
      console.log("✓ Already logged in");
      return;
    }

    console.log("🔐 Login required");

    await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await this.page.fill('input[type="email"]', this.params.botEmail);
    await this.page.click("#identifierNext");

    await this.page.waitForSelector('input[type="password"]', {
      timeout: 10000,
    });
    await this.page.fill('input[type="password"]', this.params.botPassword);
    await this.page.click("#passwordNext");

    await this.page.waitForTimeout(5000);
  }

  async openMeet(meetUrl: string) {
    if (!this.page) throw new Error("Page not initialized");

    await this.page.goto(meetUrl, { waitUntil: "domcontentloaded" });
    await this.ensureLoggedIn();
    await this.ensureDisplayName();
  }

  async ensureDisplayName() {
    if (!this.page) return;

    const input = await this.page.$('input[aria-label="Your name"]');
    if (input) {
      console.log("✍ Setting display name");
      await input.fill("Jarvis");
    }
  }

  async turnOffMicAndCamera() {
    if (!this.page) return;

    try {
      // MIC
      const micBtn = this.page.getByRole("button", {
        name: /turn off microphone/i,
      });

      if (await micBtn.isVisible()) {
        await micBtn.click();
        console.log("Mic turned OFF");
      }

      // CAMERA
      const camBtn = this.page.getByRole("button", {
        name: /turn off camera/i,
      });

      if (await camBtn.isVisible()) {
        await camBtn.click();
        console.log("Camera turned OFF");
      }
    } catch (err) {
      console.error("Failed to toggle mic/cam:", err);
    }
  }
  async turnOnCaptions() {
    if (!this.page) return;
    try {
      const captionButton = this.page.getByRole("button", {
        name: /turn on captions/i,
      });

      const isCaptionBtnVisible = await captionButton?.isVisible();

      if (isCaptionBtnVisible) {
        await captionButton?.click();
        console.log("Captions turned on");
      }
    } catch (error) {
      console.log("Failed to toggle captions", JSON.stringify(error));
      return;
    }
  }

  async sendConfirmationInChat(message: string) {
    if (!this.page) return;
    try {
      const chatTextArea = this.page.getByRole("textbox", {
        name: /send a message/i,
      });

      const sendMessageButton = this.page.getByRole("button", {
        name: /send a message/i,
      });
      const isChatTextAreaVisible = await chatTextArea.isVisible();
      const isSendBtnVisible = await sendMessageButton.isVisible();

      if (isChatTextAreaVisible && isSendBtnVisible && message) {
        chatTextArea.click();
        chatTextArea.fill(message);
        sendMessageButton.click();
      }
    } catch (error) {
      console.log(
        "Error while sending the confirmation in the chat",
        JSON.stringify(error)
      );
      return;
    }
  }

  async joinMeeting() {
    if (!this.page) return;

    const joinBtn = await this.page.$('button:has-text("Join now")');
    if (joinBtn) {
      console.log("➡ Clicking Join now");
      await joinBtn.click();
    }
  }

  async isInMeeting(): Promise<boolean> {
    if (!this.page || this.page.isClosed()) return false;

    try {
      const joinBtn = await this.page.$('button:has-text("Join now")');
      const micBtn = await this.page.$('button[aria-label*="microphone"]');
      return !joinBtn && !!micBtn;
    } catch {
      return false;
    }
  }

  async startPolling(meetUrl: string, meetingId: string) {
    console.log("🤖 Bot started");

    await this.initialize();
    await this.openMeet(meetUrl);

    this.params.onCallbacks?.onJoining?.();

    const pollInterval = setInterval(async () => {
      try {
        if (!this.page || this.page.isClosed() || this.hasEnded) {
          console.log("🛑 Browser closed. Stopping bot.");
          clearInterval(pollInterval);
          this.params.onCallbacks?.onFailure?.("Browser closed");
          return;
        }
        const inMeeting = await this.isInMeeting();
        if (!this.hasJoined && inMeeting) {
          this.hasJoined = true;
          let chatMessage;
          console.log("✅ Joined meeting");

          this.params.onCallbacks?.onJoined?.();
          await this.turnOnCaptions();
          const proceedTranscript = await captionsController.initialize(
            this.page,
            meetingId
          );
          if (!proceedTranscript) {
            chatMessage =
              "Due to some technical issue captions capturing is not possible";
            this.params.onCallbacks!.onFailure!(chatMessage);
          } else {
            chatMessage =
              "We can start the meeting You Agent started capturing the captions";
            this.params.onCallbacks!.onCaptureStart!();
          }
          await this.sendConfirmationInChat(chatMessage);

          return;
        }

        if (this.hasJoined && !inMeeting) {
          this.hasEnded = true;
          console.log("📞 Meeting ended");
          clearInterval(pollInterval);
          await captionsController.dispose(this.page);
          await this.params.onCallbacks!.onMeetingEnd!(meetingId);
          return;
        }

        if (!this.hasJoined) {
          await this.turnOffMicAndCamera();
          await this.joinMeeting();
        }
      } catch (err) {
        console.log("⚠ Polling error, stopping:", err);
        clearInterval(pollInterval);
      }
    }, 10_000);

    process.on("SIGINT", () => {
      clearInterval(pollInterval);
      process.exit();
    });
  }
}

export default GoogleMeetBot;
