import "dotenv/config";
import { Request, Response } from "express";
import crypto from "crypto";
import { SlackEventPayload } from "./slack.types";
import meetingController from "../meetings.controller";

class SlackController {
  public handleEvent = async (
    req: Request & { rawBody?: Buffer },
    res: Response,
  ): Promise<Response> => {
    try {
      
      const body = req.body as SlackEventPayload;

      /* -------------------------------------------------- */
      /* 1. URL verification (Slack handshake)              */
      /* -------------------------------------------------- */
      if (body.type === "url_verification") {
        return res.status(200).json({ challenge: body.challenge });
      }

      /* -------------------------------------------------- */
      /* 2. Verify Slack signature                          */
      /* -------------------------------------------------- */
      if (!this.verifySlackSignature(req)) {
        return res.status(401).send("Invalid Slack signature");
      }

      const retryNum = req.headers["x-slack-retry-num"];
      if (retryNum !== undefined) {
        // Slack retry — ACK but DO NOTHING
        return res.status(200).send();
      }

      const event = body.event;

      /* -------------------------------------------------- */
      /* 3. Ignore invalid / bot events                     */
      /* -------------------------------------------------- */
      if (!event || event.bot_id || typeof event.text !== "string") {
        return res.status(200).send();
      }

      /* -------------------------------------------------- */
      /* 4. Handle message / mention                        */
      /* -------------------------------------------------- */
      if (
        (event.type === "message" || event.type === "app_mention") &&
        event.channel === process.env.SLACK_POST_CALL_INTAKE
      ) {
        const meetingUrl = this.extractMeetingUrl(event.text);

        if (meetingUrl) {
          // 🔥 Fire-and-forget — NEVER block Slack
          setImmediate(() => {
            meetingController
              .scheduleMeeting(meetingUrl)
              .catch((err: unknown) => {
                console.error(
                  "Slack-triggered meeting scheduling failed:",
                  err,
                );
              });
          });
        }
      }

      /* -------------------------------------------------- */
      /* 5. Always acknowledge Slack                        */
      /* -------------------------------------------------- */
      return res.status(200).send();
    } catch (err) {
      // 🚨 NEVER throw to Slack
      console.error("Slack controller fatal error:", err);
      return res.status(200).send();
    }
  };

  /* ---------------------------------------------------- */
  /* Slack signature verification                         */
  /* ---------------------------------------------------- */
  private verifySlackSignature(req: Request & { rawBody?: Buffer }): boolean {
    const ts = req.headers["x-slack-request-timestamp"];
    const sig = req.headers["x-slack-signature"];

    if (!ts || !sig || !req.rawBody) return false;

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(ts)) > 300) return false;

    const base = `v0:${ts}:${req.rawBody.toString()}`;
    const expected =
      "v0=" +
      crypto
        .createHmac("sha256", process.env.SLACK_SIGNING_SECRET!)
        .update(base)
        .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(sig as string),
    );
  }

  /* ---------------------------------------------------- */
  /* Meeting URL extraction                               */
  /* ---------------------------------------------------- */
  private extractMeetingUrl(text: string): string | null {
    /**
     * Strict Google Meet validation:
     * https://meet.google.com/abc-defg-hij
     */
    const googleMeetRegex =
      /https?:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i;

    const zoomRegex = /https?:\/\/(?:www\.)?zoom\.us\/j\/\d+/i;

    const teamsRegex =
      /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/i;

    const googleMatch = text.match(googleMeetRegex);
    if (googleMatch) {
      // Normalize Google Meet URL
      return `https://meet.google.com/${googleMatch[1]}`;
    }

    const zoomMatch = text.match(zoomRegex);
    if (zoomMatch) return zoomMatch[0];

    const teamsMatch = text.match(teamsRegex);
    if (teamsMatch) return teamsMatch[0];

    return null;
  }

  /**
   * Handle Slack interactive events (button clicks, modal submissions)
   */
  public slackInteractionsEvent = async (
    req: Request & { rawBody?: Buffer },
    res: Response,
  ): Promise<Response> => {
    try {
      // Parse the payload (Slack sends it as form-encoded 'payload' field)
      const payload = JSON.parse(req.body.payload);

      // Always acknowledge Slack immediately (3-second window)
      res.status(200).send();

      // Process asynchronously (don't block Slack's webhook)
      setImmediate(async () => {
        try {
          await this.handleInteractivePayload(payload);
        } catch (error) {
          console.error("❌ Interactive payload handler failed:", error);
        }
      });

      return res;
    } catch (error) {
      console.error("❌ Slack interactive event error:", error);
      return res.status(200).send(); // Always 200 to Slack
    }
  };

  /**
   * Process the interactive payload based on type
   */
  private async handleInteractivePayload(payload: any) {
    const { WebClient } = await import("@slack/web-api");
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN!);

    // Import necessary utilities
    const {
      buildEditEmailModal,
      buildEditRecipientModal,
      buildSuccessMessage,
      buildErrorMessage,
      buildExpiredMessage,
      buildRejectedMessage,
    } = await import("./slack.utility.js");

    const {
      findEmailInterruptionById,
      getEmailDraftByInterruptionId,
      updateInterruptionStatus,
      updateEmailDraftFields,
      updateEmailDraftRecipient,
    } = await import("../../../services/ai_services/followup_agent.services.js");

    const { executeEmailTool } = await import(
      "../../../services/email/email_tool_executor.js"
    );

    try {
      // ============================================================
      // BUTTON ACTIONS
      // ============================================================
      if (payload.type === "block_actions") {
        const action = payload.actions[0];
        const interruptionId = action.value;
        const userId = payload.user.id;

        switch (action.action_id) {
          // ========================================================
          // CONFIRM & SEND
          // ========================================================
          case "followup_email_confirm": {
            const result = await executeEmailTool({
              interruptionId,
              decidedBy: userId,
            });

            if (result.success) {
              const emailPayload = result.emailResult;
              await slack.chat.postMessage({
                channel: process.env.SLACK_POST_CALL_FOLLOWUP_CHANNEL!,
                blocks: buildSuccessMessage({
                  to: emailPayload.to,
                  subject: emailPayload.subject,
                }),
                text: "Email sent successfully",
              });
            } else {
              await slack.chat.postMessage({
                channel: process.env.SLACK_POST_CALL_FOLLOWUP_CHANNEL!,
                blocks: buildErrorMessage({
                  reason: result.message,
                }),
                text: "Email send failed",
              });
            }
            break;
          }

          // ========================================================
          // EDIT EMAIL (subject + body)
          // ========================================================
          case "followup_email_edit": {
            const interruption = await findEmailInterruptionById(interruptionId);
            const draft = await getEmailDraftByInterruptionId(interruptionId);

            if (!interruption || !draft) {
              console.error("Interruption or draft not found");
              return;
            }

            // If no recipient, show recipient-only modal instead
            if (!draft.to_original && !draft.to_confirmed) {
              const modal = buildEditRecipientModal({
                interruptionId,
                subject: draft.edited_subject ?? draft.subject,
              });

              await slack.views.open({
                trigger_id: payload.trigger_id,
                view: modal,
              });
            } else {
              // Show full edit modal
              const modal = buildEditEmailModal({
                interruptionId,
                to: draft.to_confirmed ?? draft.to_original,
                subject: draft.edited_subject ?? draft.subject,
                body: draft.edited_body ?? draft.original_body,
              });

              await slack.views.open({
                trigger_id: payload.trigger_id,
                view: modal,
              });
            }
            break;
          }

          // ========================================================
          // REJECT
          // ========================================================
          case "followup_email_reject": {
            await updateInterruptionStatus({
              interruptionId,
              status: "REJECTED",
              decidedBy: userId,
            });

            await slack.chat.postMessage({
              channel: process.env.SLACK_POST_CALL_FOLLOWUP_CHANNEL!,
              blocks: buildRejectedMessage({ decidedBy: userId }),
              text: "Email rejected",
            });
            break;
          }
        }
      }

      // ============================================================
      // MODAL SUBMISSIONS
      // ============================================================
      else if (payload.type === "view_submission") {
        const interruptionId = payload.view.private_metadata;
        const callbackId = payload.view.callback_id;
        const values = payload.view.state.values;

        // ========================================================
        // EDIT EMAIL SUBMISSION
        // ========================================================
        if (callbackId === "edit_email_submit") {
          const subject = values.subject_block.subject_input.value;
          const body = values.body_block.body_input.value;

          await updateEmailDraftFields({
            interruptionId,
            edited_subject: subject,
            edited_body: body,
          });

          console.log(`✅ Email draft updated for interruption: ${interruptionId}`);
        }

        // ========================================================
        // EDIT RECIPIENT SUBMISSION
        // ========================================================
        else if (callbackId === "edit_recipient_submit") {
          const recipient = values.recipient_block.recipient_input.value;

          // Basic email validation
          if (!recipient || !recipient.includes("@")) {
            // Slack will show validation error
            return;
          }

          await updateEmailDraftRecipient({
            interruptionId,
            to_confirmed: recipient,
          });

          console.log(`✅ Recipient added for interruption: ${interruptionId}`);
        }
      }
    } catch (error) {
      console.error("❌ Payload handler failed:", error);
    }
  }
}

export default new SlackController();
