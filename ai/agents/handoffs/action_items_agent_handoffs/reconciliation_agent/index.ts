import { ExecutionContext } from "../../../../execution_orchasterate/execution_context";
import BaseAgent from "../../../baseAgent";
import ReconciliationAgentConstants from "./constants";
import { RECONCILIATION_AGENT_INSTRUCTION } from "./reconciliation_agent.instruction";
import { ReconciliationsAgentOutputType } from "./reconciliation_agent.type";
import { fetchOpenActionItems } from "./tools/fetch_action_items";

class ReconciliationAgent extends BaseAgent<ExecutionContext> {
  constructor() {
    super(
      ReconciliationAgentConstants.name,
      RECONCILIATION_AGENT_INSTRUCTION,
      ReconciliationAgentConstants.model,
      ReconciliationsAgentOutputType,
      ReconciliationAgentConstants.modelSettings,
      [fetchOpenActionItems as any]
    );
  }
}

export default ReconciliationAgent;
