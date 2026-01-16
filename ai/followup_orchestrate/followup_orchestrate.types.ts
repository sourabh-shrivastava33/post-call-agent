import { ReconciliationsAgentOutputInterface } from "../agents/handoffs/action_items_agent_handoffs/reconciliation_agent/reconciliation_agent.type";
import { BlockersReconciliationOutput } from "../agents/handoffs/blockers_agent_handoffs/reconciliation_agent/recociliation_agent.types";

type BaseActionItemsType = ReconciliationsAgentOutputInterface["action_items"];

export type ExtendedActionItemsType = BaseActionItemsType & {
  externalId: string;
};

type BaseBlockersType = BlockersReconciliationOutput["blockers"];

export type ExtendedBlockersType = BaseBlockersType & {
  externalId: string;
};
