import BrowserManager from "./browserManagement";
import { Page } from "playwright";
import captionsController from "./captions/captions-controller";
import startExecution from "../../ai/start_execution";
import { BotLogger } from "./bot-logger";
import {
  JoinResult,
  LoginResult,
  MeetingState,
  BotHealthMetrics,
  ErrorSeverity,
  ClassifiedError,
} from "./bot.types";

interface GoogleMeetBotParams {
  botEmail: string;
  botPassword: string;
  meetingId: string;
  onCallbacks?: {
    onJoining?: (meetingUrl: string) => void;
    onJoined?: () => void;
    onCaptureStart?: () => void;
    onMeetingEnd?: (meetingId: string) => Promise<void>;
    onFailure?: (reason: string) => void;
  };
}

class GoogleMeetBot {
  private page: Page | null = null;
  private meetingId: string;
  private logger: BotLogger;
  private lastProcessedChatCount = 0;

  // State tracking
  private state: MeetingState = {
    hasJoined: false,
    hasEnded: false,
    inWaitingRoom: false,
    captionsActive: false,
    lastHealthCheck: new Date(),
  };

  // Health metrics
  private metrics: BotHealthMetrics = {
    joinAttempts: 0,
    captionRetries: 0,
    errorCount: 0,
    sessionStartTime: new Date(),
  };

  // Configuration
  private readonly MAX_LOGIN_ATTEMPTS = 3;
  private readonly MAX_CAPTION_RETRIES = 5;
  private readonly MAX_ERROR_THRESHOLD = 10;
  private readonly POLL_INTERVAL_MS = 5000;
  private readonly SESSION_CHECK_INTERVAL_MS = 30000;

  constructor(private params: GoogleMeetBotParams) {
    this.meetingId = params.meetingId;
    this.logger = new BotLogger(params.meetingId);
  }

  async initialize() {
    this.logger.info("Initializing browser");
    const manager = BrowserManager.getInstance();
    this.page = await manager.getPage();
    this.startSessionMonitoring();
  }

  /**
   * Monitor session health every 30 seconds
   * Detect if logged out mid-meeting
   */
  private startSessionMonitoring() {
    setInterval(async () => {
      if (!this.page || this.page.isClosed()) return;

      try {
        const url = this.page.url();
        if (url.includes("accounts.google.com")) {
          this.logger.error("Session expired mid-meeting", { url });
          this.params.onCallbacks?.onFailure?.("Session expired");
        }
        this.state.lastHealthCheck = new Date();
      } catch (error) {
        this.logger.warn("Session health check failed", { error });
      }
    }, this.SESSION_CHECK_INTERVAL_MS);
  }

  /**
   * Enhanced login with retry logic and 2FA detection
   */
  async ensureLoggedIn(): Promise<void> {
    if (!this.page) return;

    const url = this.page.url();
    if (!url.includes("accounts.google.com")) {
      this.logger.info("Already logged in");
      return;
    }

    this.logger.info("Login required, attempting authentication");

    for (let attempt = 1; attempt <= this.MAX_LOGIN_ATTEMPTS; attempt++) {
      try {
        const result = await this.attemptLogin();

        if (result.success) {
          this.logger.info("Login successful");
          return;
        }

        if (result.requires2FA) {
          throw new Error(
            "2FA required - manual intervention needed. Please login manually in the bot-profile browser.",
          );
        }

        if (result.securityChallenge) {
          throw new Error(
            "Google security verification required. Please complete verification manually.",
          );
        }

        this.logger.warn(`Login attempt ${attempt} failed`, {
          error: result.error,
        });
        await this.page.waitForTimeout(2000 * attempt); // Exponential backoff
      } catch (error: any) {
        if (attempt === this.MAX_LOGIN_ATTEMPTS) {
          throw error;
        }
        this.logger.warn(`Login attempt ${attempt} error`, {
          error: error.message,
        });
      }
    }

    throw new Error(`Login failed after ${this.MAX_LOGIN_ATTEMPTS} attempts`);
  }

  /**
   * Attempt single login
   */
  private async attemptLogin(): Promise<LoginResult> {
    if (!this.page) return { success: false, error: "Page not initialized" };

    try {
      // Check for 2FA or security challenges
      const twoFactorPrompt = await this.page.$('text="2-Step Verification"');
      if (twoFactorPrompt) {
        return { success: false, requires2FA: true };
      }

      const securityCheck = await this.page.$('text="Verify it\'s you"');
      if (securityCheck) {
        return { success: false, securityChallenge: true };
      }

      // Normal email/password flow
      const emailInput = await this.page.waitForSelector(
        'input[type="email"]',
        { timeout: 10000 },
      );
      await emailInput.fill(this.params.botEmail);
      await this.page.click("#identifierNext");

      const passwordInput = await this.page.waitForSelector(
        'input[type="password"]',
        { timeout: 10000 },
      );
      await passwordInput.fill(this.params.botPassword);
      await this.page.click("#passwordNext");

      await this.page.waitForTimeout(5000);

      // Check if login successful
      const stillOnLogin = this.page.url().includes("accounts.google.com");
      if (stillOnLogin) {
        return {
          success: false,
          error: "Still on login page after submission",
        };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async openMeet(meetUrl: string) {
    if (!this.page) throw new Error("Page not initialized");

    this.logger.info("Opening Meet URL", { meetUrl });
    await this.page.goto(meetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await this.ensureLoggedIn();
    await this.ensureDisplayName();
  }

  async ensureDisplayName() {
    if (!this.page) return;

    const input = await this.page.$('input[aria-label="Your name"]');
    if (input) {
      this.logger.info("Setting display name");
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
        this.logger.debug("Microphone turned off");
      }

      // CAMERA
      const camBtn = this.page.getByRole("button", {
        name: /turn off camera/i,
      });

      if (await camBtn.isVisible()) {
        await camBtn.click();
        this.logger.debug("Camera turned off");
      }
    } catch (err) {
      this.logger.warn("Failed to toggle mic/camera", { error: err });
    }
  }

  /**
   * Enhanced caption toggle with retry logic
   */
  async turnOnCaptions(): Promise<boolean> {
    if (!this.page) return false;

    for (let i = 0; i < this.MAX_CAPTION_RETRIES; i++) {
      try {
        this.metrics.captionRetries = i + 1;

        const captionButton = this.page.getByRole("button", {
          name: /turn on captions/i,
        });

        const isVisible = await captionButton.isVisible({ timeout: 2000 });

        if (isVisible) {
          await captionButton.click();
          await this.page.waitForTimeout(1000);

          // Verify captions actually turned on
          const captionsActive = await this.verifyCaptionsActive();
          if (captionsActive) {
            this.logger.info("Captions enabled successfully");
            this.state.captionsActive = true;
            this.metrics.lastSuccessfulCaptionTime = new Date();
            return true;
          }
        }

        this.logger.warn(`Caption enable attempt ${i + 1} failed, retrying...`);
        await this.page.waitForTimeout(2000);
      } catch (error) {
        this.logger.warn(`Caption enable attempt ${i + 1} error`, { error });
      }
    }

    this.logger.error("Failed to enable captions after max retries", {
      attempts: this.MAX_CAPTION_RETRIES,
    });
    return false;
  }

  /**
   * Verify captions are actually active
   */
  private async verifyCaptionsActive(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const captionRegion = await this.page.$(
        'div[role="region"][aria-label*="Captions"]',
      );
      return !!captionRegion;
    } catch {
      return false;
    }
  }

  async sendConfirmationInChat(message: string) {
    if (!this.page || !message) return;

    const page = this.page;

    try {
      this.logger.debug("Sending chat confirmation");

      // Open chat
      const chatButton = page.locator('button[aria-label*="Chat"]');
      if (await chatButton.isVisible()) {
        await chatButton.click({ force: true });
        await page.waitForTimeout(800);
      }

      // Type message
      const chatTextarea = page.locator(
        'textarea[aria-label="Send a message"]',
      );
      await chatTextarea.waitFor({ state: "visible", timeout: 8000 });
      await chatTextarea.click({ force: true });
      await page.waitForTimeout(200);
      await chatTextarea.pressSequentially(message, { delay: 10 });
      await page.waitForTimeout(300);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      this.logger.info("Chat confirmation sent");
    } catch (error) {
      this.logger.error("Failed to send chat message", {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Enhanced join flow with comprehensive state detection
   */
  async joinMeeting(): Promise<JoinResult> {
    if (!this.page) {
      return {
        status: "unknown",
        canJoin: false,
        message: "Page not initialized",
      };
    }

    this.metrics.joinAttempts++;

    try {
      // Check for meeting ended
      const meetingEndedMsg = await this.page.$(
        'text="This meeting has ended"',
      );
      if (meetingEndedMsg) {
        this.logger.warn("Meeting has already ended");
        return {
          status: "ended",
          canJoin: false,
          message: "Meeting has ended",
        };
      }

      // Check for meeting full
      const meetingFullMsg = await this.page.$("text=/meeting is full/i");
      if (meetingFullMsg) {
        this.logger.error("Meeting participant limit reached");
        return {
          status: "full",
          canJoin: false,
          message: "Meeting is full",
        };
      }

      // Check for "Ask to join" (host approval required)
      const askToJoinBtn = await this.page.$('button:has-text("Ask to join")');
      if (askToJoinBtn) {
        this.logger.info(
          "Meeting requires host approval, clicking 'Ask to join'",
        );
        await askToJoinBtn.click();
        this.state.inWaitingRoom = true;
        return {
          status: "waiting_approval",
          canJoin: false,
          message: "Waiting for host approval",
        };
      }

      // Normal join flow
      const joinBtn = await this.page.$('button:has-text("Join now")');
      if (joinBtn) {
        this.logger.info("Clicking 'Join now' button");
        await joinBtn.click();
        return {
          status: "joined",
          canJoin: true,
          message: "Join button clicked",
        };
      }

      return {
        status: "unknown",
        canJoin: false,
        message: "No join button found",
      };
    } catch (error: any) {
      this.logger.error("Join attempt failed", { error: error.message });
      return {
        status: "unknown",
        canJoin: false,
        message: error.message,
      };
    }
  }

  /**
   * Detect if in waiting room
   */
  async detectWaitingRoom(): Promise<boolean> {
    if (!this.page || this.page.isClosed()) return false;

    try {
      const waitingLocator = this.page.getByText(/waiting.*host.*let.*in/i);

      return await waitingLocator.isVisible().catch(() => false);
    } catch {
      return false;
    }
  }

  async isInMeeting(): Promise<boolean> {
    if (!this.page || this.page.isClosed()) return false;

    try {
      // ---------- PRE-JOIN STATE ----------
      const joinNowBtn = this.page.getByRole("button", { name: /join now/i });
      const askToJoinBtn = this.page.getByRole("button", {
        name: /ask to join/i,
      });

      if (await joinNowBtn.isVisible().catch(() => false)) return false;
      if (await askToJoinBtn.isVisible().catch(() => false)) return false;

      // ---------- WAITING ROOM ----------
      const waitingRoom = this.page.getByText(
        "Please wait until a meeting host brings you into the call",
        { exact: false },
      );

      if (await waitingRoom.isVisible().catch(() => false)) return false;

      // ---------- IN MEETING ----------
      const micControl = this.page.locator(
        'button[aria-label*="microphone" i]',
      );

      if ((await micControl.count()) > 0) return true;

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Classify error severity for intelligent retry logic
   */
  private classifyError(err: any): ClassifiedError {
    const message = String(err?.message || err);

    // Transient errors - safe to retry
    if (
      message.includes("timeout") ||
      message.includes("ECONNREFUSED") ||
      message.includes("waiting for selector") ||
      message.includes("Navigation timeout")
    ) {
      return {
        severity: "transient",
        type: "network",
        message,
        originalError: err,
        timestamp: new Date(),
      };
    }

    // Fatal errors - stop immediately
    if (
      message.includes("Session expired") ||
      message.includes("2FA") ||
      message.includes("security verification") ||
      message.includes("Page not initialized")
    ) {
      return {
        severity: "fatal",
        type: "authentication",
        message,
        originalError: err,
        timestamp: new Date(),
      };
    }

    // Unknown errors
    return {
      severity: "unknown",
      type: "general",
      message,
      originalError: err,
      timestamp: new Date(),
    };
  }

  private async scanChatForCommands(): Promise<"END_MEETING" | null> {
    if (!this.page) return null;

    try {
      const chatLocator = this.page.locator(
        'div[aria-live="polite"] div[jscontroller][jsaction]',
      );

      const chatMessages = await chatLocator.allInnerTexts(); // replaces $$

      if (chatMessages.length <= this.lastProcessedChatCount) {
        return null;
      }

      const newMessages = chatMessages.slice(this.lastProcessedChatCount);
      this.lastProcessedChatCount = chatMessages.length;

      for (const raw of newMessages) {
        const text = raw?.toLowerCase().trim() ?? "";

        if (this.isExplicitEndCommand(text)) {
          return "END_MEETING";
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private isExplicitEndCommand(text: string): boolean {
    return (
      text.includes("@jarvis") &&
      (text.includes("/end") ||
        text.includes("end meeting") ||
        text.includes("stop meeting"))
    );
  }

  /**
   * Main polling loop with enhanced error handling
   */
  async startPolling(meetUrl: string, meetingId: string) {
    this.logger.info("Bot started");

    try {
      await this.initialize();
      await this.openMeet(meetUrl);
      this.params.onCallbacks?.onJoining?.(meetUrl);
    } catch (error: any) {
      this.logger.error("Initialization failed", { error: error.message });
      this.params.onCallbacks?.onFailure?.(
        `Initialization failed: ${error.message}`,
      );
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        await this.pollOnce();
      } catch (err: any) {
        if (err?.cause == "Browser closed") {
          this.logger.error("Browser closed");
          clearInterval(pollInterval);
          return;
        }
        const classified = this.classifyError(err);

        this.logger.error("Polling error", {
          severity: classified.severity,
          type: classified.type,
          message: classified.message,
        });

        // Handle based on severity
        if (classified.severity === "transient") {
          this.logger.warn("Transient error, continuing polling");
          return; // Continue polling
        }

        if (classified.severity === "fatal") {
          this.logger.error("Fatal error, stopping bot");
          clearInterval(pollInterval);
          this.params.onCallbacks?.onFailure?.(classified.message);
          return;
        }

        // Unknown errors - use circuit breaker
        this.metrics.errorCount++;
        if (this.metrics.errorCount > this.MAX_ERROR_THRESHOLD) {
          this.logger.error("Error threshold exceeded, stopping bot", {
            errorCount: this.metrics.errorCount,
          });
          clearInterval(pollInterval);
          this.params.onCallbacks?.onFailure?.("Too many errors, bot stopped");
        }
      }
    }, this.POLL_INTERVAL_MS);

    process.on("SIGINT", () => {
      this.logger.info("SIGINT received, stopping bot");
      clearInterval(pollInterval);
      process.exit();
    });
  }

  /**
   * Single poll cycle - extracted for testability and error handling
   */
  private async pollOnce(): Promise<void> {
    if (!this.page || this.page.isClosed() || this.state.hasEnded) {
      this.logger.warn("Browser closed or meeting ended");
      throw new Error("Browser closed", { cause: "Browser closed" });
    }

    // Check if in waiting room
    const inWaitingRoom = await this.detectWaitingRoom();
    if (inWaitingRoom) {
      this.logger.debug("Still in waiting room, polling continues");
      return;
    }

    const inMeeting = await this.isInMeeting();

    // CASE 1: Just joined meeting
    if (!this.state.hasJoined && inMeeting) {
      this.state.hasJoined = true;
      let chatMessage;
      this.logger.info("Successfully joined meeting");

      this.params.onCallbacks?.onJoined?.();

      // Enable captions
      const captionsEnabled = await this.turnOnCaptions();

      // Initialize caption controller
      const proceedTranscript = await captionsController.initialize(
        this.page,
        this.meetingId,
      );

      if (!proceedTranscript || !captionsEnabled) {
        chatMessage =
          "Due to some technical issue captions capturing is not possible";
        this.logger.error("Caption initialization failed");
        this.params.onCallbacks!.onFailure!(chatMessage);
      } else {
        chatMessage =
          "We can start the meeting You Agent started capturing the captions";
        this.logger.info("Caption capture started successfully");
        this.params.onCallbacks!.onCaptureStart!();
      }

      await this.sendConfirmationInChat(chatMessage);
      return;
    }

    // CASE 1.5: In meeting — listen for explicit chat commands
    if (this.state.hasJoined && inMeeting && !this.state.hasEnded) {
      const command = await this.scanChatForCommands();

      if (command === "END_MEETING") {
        this.logger.info("End-meeting command received via chat");

        await this.sendConfirmationInChat(
          "End-meeting command received. Wrapping up and starting post-meeting execution.",
        );

        this.state.hasEnded = true;

        await captionsController.dispose(this.page);
        await this.params.onCallbacks!.onMeetingEnd!(this.meetingId);
        await startExecution(this.meetingId);

        return;
      }
    }

    // CASE 2: Meeting ended
    if (this.state.hasJoined && !inMeeting) {
      this.state.hasEnded = true;
      this.logger.info("Meeting ended, cleaning up");
      await captionsController.dispose(this.page);
      await this.params.onCallbacks!.onMeetingEnd!(this.meetingId);
      await startExecution(this.meetingId);
      return;
    }

    // CASE 3: Still waiting to join
    if (!this.state.hasJoined) {
      await this.turnOffMicAndCamera();
      const joinResult = await this.joinMeeting();

      if (joinResult.status === "ended" || joinResult.status === "full") {
        throw new Error(joinResult.message);
      }

      if (joinResult.status === "waiting_approval") {
        this.logger.debug("Waiting for host approval");
      }
    }
  }
}

export default GoogleMeetBot;
