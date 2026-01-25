import "dotenv/config";

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
