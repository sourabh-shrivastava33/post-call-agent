export interface SlackEvent {
  type: "message" | "app_mention";
  text?: string;
  user?: string;
  channel?: string;
  bot_id?: string;
}

export interface SlackEventPayload {
  type: "event_callback" | "url_verification";
  challenge?: string;

  event_id?: string;
  event_time?: number;

  event?: {
    type: string;
    text?: string;
    channel?: string;
    bot_id?: string;
  };
}

export interface SlackInteractivePayload {
  type: "block_actions" | "view_submission";
  team: {
    id: string;
    domain: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
  };
  trigger_id?: string;
  response_url?: string;
  actions?: SlackAction[];
  view?: SlackModalView;
  container?: {
    type: string;
    message_ts: string;
    channel_id: string;
  };
}

export interface SlackAction {
  action_id: string;
  block_id: string;
  value: string;
  type: string;
  action_ts: string;
}

export interface SlackModalView {
  id: string;
  type: "modal";
  callback_id: string;
  state: {
    values: {
      [blockId: string]: {
        [actionId: string]: {
          type: string;
          value?: string;
        };
      };
    };
  };
  private_metadata?: string;
}

export interface EmailInterruptionData {
  id: string;
  meetingId: string;
  toolName: string;
  to: string | null;
  subject: string;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  expiresAt: Date;
  decidedAt: Date | null;
  decidedBy: string | null;
  createdAt: Date;
}

export interface EmailDraftData {
  id: string;
  meetingId: string;
  to_original: string | null;
  to_confirmed: string | null;
  interruption_id: string;
  subject: string;
  edited_subject: string | null;
  original_body: string;
  edited_body: string | null;
  createdAt: Date;
}
