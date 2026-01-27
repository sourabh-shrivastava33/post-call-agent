import "dotenv/config";
import { sendFollowupEmail } from "../../../services/email/send_follow_up_email";
import { findEmailInterruptionById } from "../../../services/ai_services/followup_agent.services";

export const divider = { type: "divider" };

export const header = (text: string) => ({
  type: "header",
  text: {
    type: "plain_text",
    text,
  },
});

export const context = (elements: string[]) => ({
  type: "context",
  elements: elements.map((text) => ({
    type: "mrkdwn",
    text,
  })),
});

export const fieldsSection = (fields: { title: string; value: string }[]) => ({
  type: "section",
  fields: fields.map((f) => ({
    type: "mrkdwn",
    text: `*${f.title}*\n${f.value}`,
  })),
});

export const meetingDetectedBlocks = ({
  meetingId,
  meetingUrl,
  triggeredBy,
}: {
  meetingId: string;
  meetingUrl: string;
  triggeredBy: string;
}) => [
  header("🟢 New meeting detected"),
  fieldsSection([
    { title: "Meeting ID", value: meetingId },
    { title: "Meeting URL", value: meetingUrl },
    { title: "Triggered By", value: `<@${triggeredBy}>` },
  ]),
  context(["System event • Intake processed"]),
  divider,
];

export const agentJoinedMeetingBlocks = ({
  meetingId,
}: {
  meetingId: string;
}) => [
  header("🤖 Agent connected to meeting"),
  fieldsSection([
    { title: "Meeting ID", value: meetingId },
    { title: "Status", value: "Connected and listening" },
  ]),
  context(["Voice agent initialized"]),
  divider,
];

export const meetingEndedBlocks = ({
  durationMinutes,
}: {
  durationMinutes: number;
}) => [
  header("🛑 Meeting ended"),
  fieldsSection([
    { title: "Duration", value: `46 minutes` },
    { title: "Transcript Status", value: "Ready for execution" },
  ]),
  context(["Waiting for post-meeting execution"]),
  divider,
];

export const executionStartedBlocks = () => [
  header("⚙️ Post-meeting execution started"),
  fieldsSection([
    { title: "Processing", value: "Action items, blockers, decisions" },
    { title: "Target System", value: "Notion execution board" },
  ]),
  context(["AI execution pipeline running"]),
  divider,
];

export const transcriptCaptureStartedBlocks = ({
  source = "Google Meet",
}: {
  source?: string;
}) => [
  header("🎙️ Capturing meeting transcript"),
  fieldsSection([
    { title: "Source", value: source },
    { title: "Mode", value: "Live caption capture" },
  ]),
  context(["Transcript pipeline active"]),
  divider,
];

export const executionSuccessBlocks = ({
  created,
  updated,
  notionUrl,
}: {
  created: number;
  updated: number;
  notionUrl: string;
}) => [
  header("✅ Post-meeting execution updated"),
  fieldsSection([
    { title: "Created", value: String(created) },
    { title: "Updated", value: String(updated) },
  ]),
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `🔗 *Notion Board*\n<${notionUrl}|Open in Notion>`,
    },
  },
  context(["Execution completed successfully"]),
  divider,
];

export const executionWarningBlocks = ({
  created,
  updated,
  errorCount,
}: {
  created: number;
  updated: number;
  errorCount: number;
}) => {
  let notionDbUrl = process.env.NOTION_DB_URL
    ? process.env.NOTION_DB_URL
    : null;
  return [
    header("⚠️ Post-meeting execution completed with warnings"),
    fieldsSection([
      { title: "Created", value: String(created) },
      { title: "Updated", value: String(updated) },
      { title: "Errors", value: String(errorCount) },
    ]),
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔗 *Notion Board*\n<${notionDbUrl}|Review in Notion>`,
        },
      },
    ],
  ];
};
export const executionFailedBlocks = ({ reason }: { reason: string }) => [
  header("❌ Post-meeting execution failed"),
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Reason*\n${reason}`,
    },
  },
  context(["No data was written to Notion"]),
  divider,
];

export const followupEmailConfirmationBlocks = ({
  interruptionId,
  meetingId,
  to,
  subject,
  body,
}: {
  meetingId: string;
  interruptionId: string;
  to: string | null | undefined;
  subject: string;
  body: string;
}) => {
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "…";
  };
  return [
    header("✉️ Follow-up email ready for confirmation"),

    fieldsSection([
      {
        title: "Meeting ID",
        value: meetingId,
      },
      {
        title: "Client Email",
        value: to ? to : "❗ Not provided",
      },
      {
        title: "Subject",
        value: subject,
      },
    ]),

    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Email Body (Preview)*\n${truncateText(body, 1200)}`,
      },
    },

    context([
      "AI-drafted follow-up • Human approval required",
      to ? "Email detected" : "Client email required before sending",
    ]),

    {
      type: "actions",
      block_id: "followup_email_actions",
      elements: [
        ...(to
          ? [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "✅ Confirm & Send",
                },
                style: "primary",
                action_id: "followup_email_confirm",
                value: interruptionId,
              },
            ]
          : []),

        {
          type: "button",
          text: {
            type: "plain_text",
            text: to ? "✏️ Edit Email" : "✏️ Add Email & Send",
          },
          action_id: "followup_email_edit",
          value: interruptionId,
        },

        {
          type: "button",
          text: {
            type: "plain_text",
            text: "❌ Reject",
          },
          style: "danger",
          action_id: "followup_email_reject",
          value: interruptionId,
        },
      ],
    },

    divider,
  ];
};

// async function handleConfirm(interruptionId: string, meetingId) {
//   const record = await findEmailInterruptionById(interruptionId);

//   if (!record) return;

//   if (new Date() > record.expiresAt) {
//     await markExpired(interruptionId);
//     return;
//   }

//   await sendFollowupEmail({
//     to: record.to!,
//     subject: record.subject,
//     body: record.body,
//     meeting_id: userId,
//   });

//   await prisma.emailFollowUpInterruption.update({
//     where: { id: interruptionId },
//     data: {
//       status: "APPROVED",
//       decidedAt: new Date(),
//       decidedBy: userId,
//     },
//   });
// }

// ============================================================================
// MODAL VIEW BUILDERS
// ============================================================================

/**
 * Build modal for editing email subject and body
 * The recipient is shown as read-only context if present
 */
export function buildEditEmailModal({
  interruptionId,
  to,
  subject,
  body,
}: {
  interruptionId: string;
  to: string | null;
  subject: string;
  body: string;
}) {
  const blocks: any[] = [];

  // Show recipient as context if present
  if (to) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📧 *Recipient:* ${to}`,
        },
      ],
    });
  }

  // Subject input
  blocks.push({
    type: "input",
    block_id: "subject_block",
    label: {
      type: "plain_text",
      text: "Email Subject",
    },
    element: {
      type: "plain_text_input",
      action_id: "subject_input",
      initial_value: subject,
      placeholder: {
        type: "plain_text",
        text: "Enter email subject",
      },
    },
  });

  // Body input
  blocks.push({
    type: "input",
    block_id: "body_block",
    label: {
      type: "plain_text",
      text: "Email Body",
    },
    element: {
      type: "plain_text_input",
      action_id: "body_input",
      multiline: true,
      initial_value: body,
      placeholder: {
        type: "plain_text",
        text: "Enter email body",
      },
    },
  });

  return {
    type: "modal" as const,
    callback_id: "edit_email_submit",
    private_metadata: interruptionId,
    title: {
      type: "plain_text" as const,
      text: "Edit Follow-up Email",
    },
    submit: {
      type: "plain_text" as const,
      text: "Save Changes",
    },
    close: {
      type: "plain_text" as const,
      text: "Cancel",
    },
    blocks,
  } as any; // Slack SDK has complex view types, using any for simplicity
}

/**
 * Build modal for editing recipient only
 * Used when no recipient was initially provided
 */
export function buildEditRecipientModal({
  interruptionId,
  subject,
}: {
  interruptionId: string;
  subject: string;
}) {
  return {
    type: "modal" as const,
    callback_id: "edit_recipient_submit",
    private_metadata: interruptionId,
    title: {
      type: "plain_text" as const,
      text: "Add Recipient Email",
    },
    submit: {
      type: "plain_text" as const,
      text: "Save Recipient",
    },
    close: {
      type: "plain_text" as const,
      text: "Cancel",
    },
    blocks: [
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `📝 *Subject:* ${subject}`,
          },
        ],
      },
      {
        type: "input",
        block_id: "recipient_block",
        label: {
          type: "plain_text",
          text: "Client Email Address",
        },
        element: {
          type: "plain_text_input",
          action_id: "recipient_input",
          placeholder: {
            type: "plain_text",
            text: "client@example.com",
          },
        },
      },
    ],
  } as any; // Slack SDK has complex view types, using any for simplicity
}

// ============================================================================
// MESSAGE BLOCKS FOR RESPONSES
// ============================================================================

export const buildSuccessMessage = ({
  to,
  subject,
}: {
  to: string;
  subject: string;
}) => [
  header("✅ Follow-up email sent"),
  fieldsSection([
    { title: "Sent to", value: to },
    { title: "Subject", value: subject },
  ]),
  context(["Email delivered successfully"]),
  divider,
];

export const buildErrorMessage = ({
  reason,
}: {
  reason: string;
}) => [
  header("❌ Failed to send email"),
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Reason*\n${reason}`,
    },
  },
  context(["Email was not sent"]),
  divider,
];

export const buildExpiredMessage = () => [
  header("⏰ Confirmation expired"),
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "This confirmation window has expired. No email was sent.",
    },
  },
  context(["Please create a new follow-up email if needed"]),
  divider,
];

export const buildRejectedMessage = ({ decidedBy }: { decidedBy: string }) => [
  header("🚫 Email rejected"),
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `Rejected by <@${decidedBy}>. No email was sent.`,
    },
  },
  context(["Follow-up email cancelled"]),
  divider,
];
