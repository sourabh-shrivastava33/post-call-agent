import "dotenv/config";

import FollowUpAgent from "../agents/followup_agent";
import {
  ExtendedActionItemsType,
  ExtendedBlockersType,
  SendFollowupEmailArgs,
} from "./followup_orchestrate.types";
import { FollowupAgentInitParams } from "../agents/followup_agent/followup_agent.type";
import {
  createEmailDraft,
  createEmailFollowUpInterruption,
} from "../../services/ai_services/followup_agent.services";
import { RunResult } from "@openai/agents-core";
import { slackLogger } from "../../models/meetings/slack/slack.logger";
import { followupEmailConfirmationBlocks } from "../../models/meetings/slack/slack.utility";

class FollowUpOrchestrator {
  private followupData: {
    action_items?: ExtendedActionItemsType;
    blockers?: ExtendedBlockersType;
    transcriptString?: string;
  } = {};
  private followupAgent: FollowUpAgent = new FollowUpAgent();
  private meetingId: string;
  constructor(
    meetingId: string,
    action_items?: ExtendedActionItemsType,
    blockers?: ExtendedBlockersType,
    transcriptString?: any | null,
  ) {
    this.followupData.action_items = action_items;
    this.followupData.blockers = blockers;
    this.followupData.transcriptString = transcriptString ?? null;
    this.meetingId = meetingId;
  }

  async run() {
    let followupPayload: FollowupAgentInitParams = {};
    const FOLLOWUP_APPROVAL_WINDOW_MINUTES = 30;
    if (this.followupData.transcriptString) {
      followupPayload.transcriptString = this.followupData.transcriptString;
    }

    if (
      this.followupData.action_items &&
      Object.keys(this.followupData.action_items).length
    ) {
      followupPayload.actionItems = this.followupData.action_items;
    }

    if (
      this.followupData.blockers &&
      Object.keys(this.followupData.blockers).length
    ) {
      followupPayload.blockers = this.followupData.blockers;
    }

    try {
      const result = await this.followupAgent.init(followupPayload);

      /**
       * 🔴 CASE 1: HUMAN-IN-THE-LOOP REQUIRED
       */
      if (this.isRunResult(result) && result.interruptions.length > 0) {
        const interruption = result.interruptions[0];

        if (!this.isSendFollowupEmailArgs(interruption.arguments)) {
          throw new Error(
            "Invalid interruption arguments for sendFollowupEmail",
          );
        }

        const now = new Date();

        const expiresAt = new Date(
          now.getTime() + FOLLOWUP_APPROVAL_WINDOW_MINUTES * 60 * 1000,
        );

        const parsedArgs =
          typeof interruption.arguments === "string"
            ? JSON.parse(interruption.arguments)
            : interruption.arguments;

        // This create email interruption  entry which will be used to tool call by
        //  customized code to send the email to the clients after approval
        const dbInterruption = await createEmailFollowUpInterruption({
          meetingId: this.meetingId,
          body: parsedArgs.body,
          subject: parsedArgs.subject,
          toolName: "sendFollowupEmail",
          expiresAt,
          ...(parsedArgs.to ? { to: parsedArgs.to } : {}),
        });

        // 2️⃣ Save Email Draft (human-editable layer)

        // This will create an email draft entry which will have original source and edited source
        await createEmailDraft({
          meetingId: this.meetingId,
          to_original: parsedArgs?.to ?? null,
          subject: parsedArgs.subject,
          original_body: parsedArgs.body,
          interruption_id: dbInterruption.id,
        });

        // 3️⃣ Send Slack approval UI
        await slackLogger.log(
          followupEmailConfirmationBlocks({
            meetingId: this.meetingId,
            interruptionId: dbInterruption.id,
            body: parsedArgs.body,
            subject: parsedArgs.subject,
            to: parsedArgs.to,
          }),
          "Post call follow-up confirmation",
          process.env.SLACK_POST_CALL_FOLLOWUP_CHANNEL,
        );
        // ⛔ STOP orchestration here
        return;
      }

      /**
       * 🟢 CASE 2: NORMAL COMPLETION (NO HITL)
       */
      console.log("Follow-up agent completed without interruption");
      console.log(JSON.stringify(result));

      // Continue to Notion / next steps if needed
      return result;
    } catch (error) {
      console.error("FollowUpOrchestrator failed", error);
      throw error;
    }
  }
  isRunResult(value: any): value is RunResult<any, any> {
    return (
      value &&
      typeof value === "object" &&
      "state" in value &&
      "interruptions" in value
    );
  }
  isSendFollowupEmailArgs(args: unknown): args is SendFollowupEmailArgs {
    if (typeof args === "string") {
      try {
        let parsedArgs = JSON.parse(args);
        return (
          typeof parsedArgs === "object" &&
          parsedArgs !== null &&
          "subject" in parsedArgs &&
          "body" in parsedArgs
        );
      } catch (error) {
        return false;
      }
    } else
      return (
        typeof args === "object" &&
        args !== null &&
        "subject" in args &&
        "body" in args
      );
  }
  createNotionExecutionPayload() {}
}

export default FollowUpOrchestrator;
