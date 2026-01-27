/**
 * Structured logger for Google Meet Bot
 * Provides consistent, machine-readable logs for monitoring and debugging
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  meetingId: string;
  level: LogLevel;
  event: string;
  data?: any;
}

export class BotLogger {
  constructor(private meetingId: string) {}

  private log(level: LogLevel, event: string, data?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      meetingId: this.meetingId,
      level,
      event,
      data,
    };

    // Console output for development
    const emoji = {
      info: "ℹ️",
      warn: "⚠️",
      error: "❌",
      debug: "🔍",
    };

    console.log(
      `${emoji[level]} [${this.meetingId}] ${event}`,
      data ? JSON.stringify(data, null, 2) : "",
    );

    // TODO: Send to monitoring system (DataDog, CloudWatch, etc.)
    // this.sendToMonitoring(logEntry);
  }

  info(event: string, data?: any) {
    this.log("info", event, data);
  }

  warn(event: string, data?: any) {
    this.log("warn", event, data);
  }

  error(event: string, data?: any) {
    this.log("error", event, data);
  }

  debug(event: string, data?: any) {
    this.log("debug", event, data);
  }
}
