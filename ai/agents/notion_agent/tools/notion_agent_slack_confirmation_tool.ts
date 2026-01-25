import { tool } from "@openai/agents";
import {
  SlackConfirmationSchema,
  slackConfirmationSchemaType,
} from "./notion_agent_tools.types";
import { logger } from "../../../../shared/logger";

export const sendSlackExecutionConfirmationTool = tool({
  name: "sendSlackExecutionConfirmation",
  description: `
Send a Slack confirmation message after successful Notion execution.

Rules:
- Called ONLY after all Notion mutations finish
- Uses incoming webhook (SLACK_WEBHOOK_URL)
- Best-effort: failures must not throw
- No retries, no side effects
`,
  strict: true,
  parameters: SlackConfirmationSchema,

  execute: async (args) => {
    const {
      meetingId,
      notionDatabaseUrl,
      result: { created, updated },
      errors,
    } = args;

    // Only notify on full success or partial success without errors
    if (errors.length > 0) {
      logger.warn("Skipping Slack confirmation due to Notion errors", {
        meetingId,
        errors,
      });
      return { sent: false };
    }

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "✅ Post-meeting execution updated",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Created:*\n${created}`,
          },
          {
            type: "mrkdwn",
            text: `*Updated:*\n${updated}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔗 *Notion Board:*\n<https://www.notion.so/${process.env.NOTION_EXECUTION_DB_ID}|Open in Notion>`,
        },
      },
    ];

    try {
      const response = await fetch(process.env.SLACK_WEBHOOK_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "Post-meeting execution updated",
          blocks,
        }),
      });

      if (!response.ok) {
        logger.error("Slack webhook failed", {
          status: response.status,
          meetingId,
        });
        return { sent: false };
      }

      logger.log("Slack execution confirmation sent", {
        meetingId,
        created,
        updated,
      });

      return { sent: true };
    } catch (err) {
      logger.error("Slack webhook exception", {
        meetingId,
        err,
      });
      return { sent: false };
    }
  },
});

export async function sendSlackExecutionConfirmationMessage({
  errors,
  meetingId,
  notionDatabaseUrl,
  result: { created, updated },
}: slackConfirmationSchemaType) {
  // Only notify on full success or partial success without errors
  if (errors.length > 0) {
    logger.warn("Skipping Slack confirmation due to Notion errors", {
      meetingId,
      errors,
    });
    return { sent: false };
  }

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Post-meeting execution updated",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Created:*\n${created}`,
        },
        {
          type: "mrkdwn",
          text: `*Updated:*\n${updated}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🔗 *Notion Board:*\n<https://www.notion.so/${process.env.NOTION_EXECUTION_DB_ID}|Open in Notion>`,
      },
    },
  ];

  try {
    const response = await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Post-meeting execution updated",
        blocks,
      }),
    });

    if (!response.ok) {
      logger.error("Slack webhook failed", {
        status: response.status,
        meetingId,
      });
      return { sent: false };
    }

    logger.log("Slack execution confirmation sent", {
      meetingId,
      created,
      updated,
    });

    return { sent: true };
  } catch (err) {
    logger.error("Slack webhook exception", {
      meetingId,
      err,
    });
    return { sent: false };
  }
}
