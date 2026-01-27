/**
 * Type definitions for Google Meet Bot reliability enhancements
 */

export type ErrorSeverity = "transient" | "fatal" | "unknown";

export interface JoinResult {
  status: "joined" | "waiting_approval" | "ended" | "full" | "unknown";
  canJoin: boolean;
  message?: string;
}

export interface LoginResult {
  success: boolean;
  requires2FA?: boolean;
  securityChallenge?: boolean;
  error?: string;
}

export interface MeetingState {
  hasJoined: boolean;
  hasEnded: boolean;
  inWaitingRoom: boolean;
  captionsActive: boolean;
  lastHealthCheck: Date;
}

export interface BotHealthMetrics {
  joinAttempts: number;
  captionRetries: number;
  errorCount: number;
  sessionStartTime: Date;
  lastSuccessfulCaptionTime?: Date;
}

export interface ClassifiedError {
  severity: ErrorSeverity;
  type: string;
  message: string;
  originalError: any;
  timestamp: Date;
}
