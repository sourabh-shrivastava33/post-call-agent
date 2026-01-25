// slack/slackLogger.ts
import { WebClient } from "@slack/web-api";
import { logger } from "../../../shared/logger";

export class SlackLogger {
  private slack = new WebClient(process.env.SLACK_BOT_TOKEN!);
  private channel = process.env.SLACK_POST_CALL_EXECUTION_CHANNEL!;

  async log(blocks: any[], text = "Post-call update") {
    try {
      return this.slack.chat.postMessage({
        channel: this.channel,
        blocks,
        text,
      });
    } catch (error) {
      logger.log(
        `Error while sending message to slack logs channel: Error -> ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      return null;
    }
  }
}

export const slackLogger = new SlackLogger();
