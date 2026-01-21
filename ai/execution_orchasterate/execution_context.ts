// src/ai/orchestrator/execution.context.ts

import { TranscriptSegment } from "../../generated/prisma";
import { ActionItemsAgentOutput } from "../agents/action__items_agents/action_items_agent_types";
import {
  ExtendedActionItemsType,
  ExtendedBlockersType,
} from "../followup_orchestrate/followup_orchestrate.types";

export interface ExecutionContext {
  meetingId: string;
  // transcriptSegments: TranscriptSegment[];
  // executedAt: Date;
  // actionItems?: ActionItemsAgentOutput[];
  currentDateTime?: string;
  timezone?: string;
}

export type PersistExecutionPayload = {
  actionItems?: {
    add: ActionItemAddWithExternalId[];
    update: ExtendedActionItemsType["update"];
  };
  blockers?: {
    add: BlockerAddWithExternalId[];
    update: ExtendedBlockersType["update"];
  };
};

export type ActionItemAdd = ExtendedActionItemsType["add"][number];
export type BlockerAdd = ExtendedBlockersType["add"][number];

export type ActionItemAddWithExternalId = ActionItemAdd & {
  externalId: string;
};
export type BlockerAddWithExternalId = BlockerAdd & { externalId: string };

export type notionActionItems = {
  add?: ActionItemAddWithExternalId[];
  update?: ExtendedActionItemsType["update"];
};

export type notionBlockers = {
  add?: BlockerAddWithExternalId[];
  update?: ExtendedBlockersType["update"];
};
