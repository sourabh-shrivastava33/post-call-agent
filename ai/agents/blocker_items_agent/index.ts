import { Runner } from "@openai/agents";
import BaseAgent from "../baseAgent";
import { BLOCKER_ITEMS_AGENT_INSTRUCTION } from "./blocker_items_agent.instructions";
import {
  BlockersAgentOutputSchema,
  BlockerSchema,
  BlockersAgentOutput,
} from "./blocker_items_agent.types";
import BlockersAgentConstants from "./contants";
import { ExecutionContext } from "../../execution_orchasterate/execution_context";
import { logger } from "../../../shared/logger";

class BlockersAgent extends BaseAgent<ExecutionContext> {
  private runner: Runner;

  constructor() {
    super(
      BlockersAgentConstants.name,
      BLOCKER_ITEMS_AGENT_INSTRUCTION,
      BlockersAgentConstants.model,
      BlockersAgentOutputSchema,
      BlockersAgentConstants.modelSettings
      // ❌ NO TOOLS — blockers must not infer or resolve anything
    );

    this.runner = new Runner();
  }

  /**
   * Analyze transcript and extract execution blockers
   */
  async analyzeTranscript(
    transcript: string,
    context: ExecutionContext
  ): Promise<BlockersAgentOutput> {
    const agent = this.getAgent();
    let attempts = 0;

    while (attempts < 3) {
      try {
        const result = await this.runner.run(agent, transcript, { context });

        if (!result?.finalOutput) {
          return { blockers: [] };
        }

        let parsed = BlockersAgentOutputSchema.parse(result.finalOutput);

        parsed = this.filterLowConfidenceBlockers(parsed);
        return parsed;
      } catch (error) {
        attempts += 1;
        logger.warn(`BlockersAgent attempt ${attempts} failed`, error);
      }
    }

    logger.log("BlockersAgent failed after max retries");
    return { blockers: [] };
  }

  private filterLowConfidenceBlockers(
    blockers: BlockersAgentOutput
  ): BlockersAgentOutput {
    blockers.blockers = blockers.blockers.filter(
      (b) => b.confidence >= BlockersAgentConstants.confidenceThreshold
    );
    return blockers;
  }
}

export default BlockersAgent;
