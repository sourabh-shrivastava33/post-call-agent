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
}

export default new SlackController();
