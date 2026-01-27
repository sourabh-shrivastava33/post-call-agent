import { z } from "zod";
import {
  ReconciliationsAgentOutputInterface,
  ReconciliationAddSchema,
  ReconciliationUpdateSchema,
} from "../agents/handoffs/action_items_agent_handoffs/reconciliation_agent/reconciliation_agent.type";
import {
  BlockersReconciliationOutput,
  BlockerAddSchema,
  BlockerUpdateSchema,
} from "../agents/handoffs/blockers_agent_handoffs/reconciliation_agent/recociliation_agent.types";

type BaseActionAdd = z.infer<typeof ReconciliationAddSchema>;
type BaseBlockersAdd = z.infer<typeof BlockerAddSchema>;

// actions having external id
export type ExtendedActionAdd = z.infer<typeof ReconciliationAddSchema> & {
  externalId: string;
};

export type ExtendedActionUpdate = z.infer<typeof ReconciliationUpdateSchema>;
// Blockers having external id
type ExtendedBlockerAdd = z.infer<typeof BlockerAddSchema> & {
  externalId: string;
};

type ExtendedBlockersUpdate = z.infer<typeof BlockerUpdateSchema>;

export type ExtendedActionItemsTypeNotion = {
  add: ExtendedActionAdd[];
  update: ExtendedActionUpdate[];
};

export type ExtendedBlockersTypeNotion = {
  add: ExtendedBlockerAdd[];
  update: ExtendedBlockersUpdate[];
};

export type ExtendedActionItemsType = {
  add: BaseActionAdd[];
  update: ExtendedActionUpdate[];
};

export type ExtendedBlockersType = {
  add: BaseBlockersAdd[];
  update: ExtendedBlockersUpdate[];
};

export interface SendFollowupEmailArgs {
  to?: string | null;
  subject: string;
  body: string;
}
