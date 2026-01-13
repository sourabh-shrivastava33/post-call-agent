import { ExecutionContext } from "../../../../execution_orchasterate/execution_context";
import BaseAgent from "../../../baseAgent";
import { BlockersReconciliationOutputSchema } from "../reconciliation_agent/recociliation_agent.types";
import { BLOCKERS_RECONCILIATION_AGENT_INSTRUCTION } from "./reconciliation_agent.instruction";
import { fetchOpenBlockers } from "./tools/fetchOpenBlockers";

class BlockersReconciliationAgent extends BaseAgent<ExecutionContext> {
  constructor() {
    super(
      "Blockers Reconciliation Agent",
      BLOCKERS_RECONCILIATION_AGENT_INSTRUCTION,
      "gpt-5-nano",
      BlockersReconciliationOutputSchema,
      { reasoning: { effort: "minimal" } },
      [fetchOpenBlockers as any]
    );
  }
}

export default BlockersReconciliationAgent;
