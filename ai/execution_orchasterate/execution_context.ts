// src/ai/orchestrator/execution.context.ts

import { TranscriptSegment } from "../../generated/prisma";
import { ActionItemsAgentOutput } from "../agents/action__items_agents/action_items_agent_types";

export interface ExecutionContext {
  meetingId: string;
  // transcriptSegments: TranscriptSegment[];
  // executedAt: Date;
  // actionItems?: ActionItemsAgentOutput[];
  currentDateTime?: string;
  timezone?: string;
}
