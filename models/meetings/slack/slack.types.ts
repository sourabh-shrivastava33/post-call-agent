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
