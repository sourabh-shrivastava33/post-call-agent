import { handoff, Runner, RunContext } from "@openai/agents";
import BaseAgent from "../baseAgent";
import { BLOCKER_ITEMS_AGENT_INSTRUCTION } from "./blocker_items_agent.instructions";
import {
  BlockersAgentOutput,
  BlockersAgentOutputSchema,
} from "./blocker_items_agent.types";
import BlockersAgentConstants from "./contants";
import { ExecutionContext } from "../../execution_orchasterate/execution_context";
import { logger } from "../../../shared/logger";
import BlockersReconciliationAgent from "../handoffs/blockers_agent_handoffs/reconciliation_agent";
import { BlockersReconciliationOutputSchema } from "../handoffs/blockers_agent_handoffs/reconciliation_agent/recociliation_agent.types";

class BlockersAgent extends BaseAgent<ExecutionContext> {
  private runner: Runner;
  private handoffCalled: boolean = false;
  private reconciliationOutput: any = null;

  constructor() {
    const reconciliationAgent = new BlockersReconciliationAgent();

    super(
      BlockersAgentConstants.name,
      BLOCKER_ITEMS_AGENT_INSTRUCTION,
      BlockersAgentConstants.model,
      undefined, // FORCE handoff
      BlockersAgentConstants.modelSettings,
      [],
      [
        handoff(reconciliationAgent.getAgent(), {
          inputType: BlockersAgentOutputSchema,
          onHandoff: (_ctx: RunContext, input?: BlockersAgentOutput) => {
            this.handoffCalled = true;
            logger.log("✓ Blockers handoff triggered");
            logger.log({
              handoffInput: input,
            });
          },
        }),
      ]
    );

    this.runner = new Runner();
  }

  async runExecutionPipeline(
    transcript: string,
    context: ExecutionContext
  ): Promise<any> {
    const agent = this.getAgent();
    let attempts = 0;
    this.resetHandoffFlag();

    while (attempts < 3) {
      try {
        const result = await this.runner.run(agent, transcript, {
          context,
        });

        logger.log(
          `Runner result keys: ${Object.keys(result || {}).join(", ")}`
        );
        logger.log(`Final output type: ${typeof result?.finalOutput}`);

        if (!result?.finalOutput) {
          return { blockers: [] };
        }

        let parsedOutput: any = result.finalOutput;
        if (typeof parsedOutput === "string") {
          try {
            parsedOutput = JSON.parse(parsedOutput);
            logger.log("✓ Successfully parsed JSON string output");
          } catch (e) {
            logger.warn("Failed to parse JSON output:", parsedOutput);
            const jsonBlockMatch = parsedOutput.match(
              /```json\s*([\s\S]*?)```/i
            );
            if (jsonBlockMatch && jsonBlockMatch[1]) {
              try {
                parsedOutput = JSON.parse(jsonBlockMatch[1]);
              } catch (e2) {
                throw new Error("Invalid JSON output from agent");
              }
            } else {
              throw new Error("Invalid JSON output from agent");
            }
          }
        }

        logger.log(`Parsed output: ${JSON.stringify(parsedOutput, null, 2)}`);
        logger.log(`Handoff called flag: ${this.handoffCalled}`);

        // Try reconciliation (handoff) output first
        try {
          const reconciliationResult =
            BlockersReconciliationOutputSchema.parse(parsedOutput);

          logger.log("✓ Successfully parsed as BlockersReconciliation output");
          logger.log(
            `  Items to add: ${reconciliationResult.blockers.add?.length || 0}`
          );
          logger.log(
            `  Items to update: ${
              reconciliationResult.blockers.update?.length || 0
            }`
          );

          this.reconciliationOutput = reconciliationResult;
          return this.reconciliationOutput;
        } catch (reconciliationParseError) {
          logger.log(
            "Not ReconciliationAgent output, trying BlockersAgent schema"
          );
          try {
            const parsed = BlockersAgentOutputSchema.parse(parsedOutput);
            logger.warn(
              "⚠️ WARNING: Parsed as BlockersAgent output - handoff did NOT occur!"
            );
            logger.warn(
              "This means the AI returned output directly instead of calling handoff."
            );
            return parsed;
          } catch (blockersParseError) {
            logger.warn("Failed to parse output as either schema:", {
              output: parsedOutput,
              reconciliationError: reconciliationParseError,
              blockersError: blockersParseError,
            });
            throw blockersParseError;
          }
        }
      } catch (error) {
        attempts += 1;
        logger.warn(`BlockersAgent attempt ${attempts} failed:`, error);
        if (attempts === 3) {
          logger.warn("Max retries reached. Last error:", error);
        }
      }
    }

    logger.warn("BlockersAgent failed after max retries");
    return { blockers: [] };
  }

  wasHandoffCalled(): boolean {
    return this.handoffCalled;
  }

  getReconciliationOutput(): any {
    return this.reconciliationOutput;
  }

  resetHandoffFlag(): void {
    this.handoffCalled = false;
    this.reconciliationOutput = null;
  }
}

export default BlockersAgent;
