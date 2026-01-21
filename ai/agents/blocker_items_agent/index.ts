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
import { ZodError } from "zod";

/**
 * Normalize nullable-but-required fields WITHOUT changing schema
 */
function normalizeBlockersOutput(raw: any): BlockersAgentOutput {
  if (!raw || typeof raw !== "object") return raw;

  if (Array.isArray(raw.blockers)) {
    raw.blockers = raw.blockers.map((b: any) => ({
      dueDate: null, // REQUIRED but nullable
      ...b,
    }));
  }

  return raw;
}

/**
 * Validate time windows are real and ordered
 */
function isValidTimeRange(start: string, end: string): boolean {
  const s = Date.parse(start);
  const e = Date.parse(end);
  return !isNaN(s) && !isNaN(e) && s <= e;
}

class BlockersAgent extends BaseAgent<ExecutionContext> {
  private runner: Runner;
  private handoffCalled = false;
  private reconciliationOutput: any = null;

  constructor() {
    const reconciliationAgent = new BlockersReconciliationAgent();

    super(
      BlockersAgentConstants.name,
      BLOCKER_ITEMS_AGENT_INSTRUCTION,
      BlockersAgentConstants.model,
      undefined, // FORCE handoff-only agent
      BlockersAgentConstants.modelSettings,
      [],
      [
        handoff(reconciliationAgent.getAgent(), {
          inputType: BlockersAgentOutputSchema,
          onHandoff: (_ctx: RunContext, input?: BlockersAgentOutput) => {
            this.handoffCalled = true;
            logger.log("✓ Blockers handoff triggered");
            logger.log({ handoffInput: input });
          },
        }),
      ],
    );

    this.runner = new Runner();
  }

  async runExecutionPipeline(
    transcript: string,
    context: ExecutionContext,
  ): Promise<any> {
    this.resetState();

    let attempts = 0;

    while (attempts < 3) {
      try {
        const result = await this.runner.run(this.getAgent(), transcript, {
          context,
        });

        if (!this.handoffCalled) {
          throw new Error(
            "BLOCKERS_AGENT_CONTRACT_VIOLATION: handoff was not called",
          );
        }

        let parsedOutput: any = result?.finalOutput;

        if (typeof parsedOutput === "string") {
          try {
            parsedOutput = JSON.parse(parsedOutput);
          } catch (error) {
            throw error;
          }
        }

        // Now expect reconciliation output ONLY
        const reconciliationResult =
          BlockersReconciliationOutputSchema.parse(parsedOutput);

        this.reconciliationOutput = reconciliationResult;

        logger.log("✓ Blockers reconciliation output accepted");
        logger.log({
          add: reconciliationResult.blockers.add?.length || 0,
          update: reconciliationResult.blockers.update?.length || 0,
        });

        return reconciliationResult;
      } catch (error) {
        attempts += 1;

        // ❌ DO NOT retry deterministic failures
        if (error instanceof ZodError) {
          logger.error("BlockersAgent schema violation (non-retryable)", error);
          throw error;
        }

        logger.warn(`BlockersAgent attempt ${attempts} failed`, error);

        if (attempts === 3) {
          logger.error("BlockersAgent failed after max retries", error);
          throw error;
        }
      }
    }

    throw new Error("BlockersAgent unreachable state");
  }

  wasHandoffCalled(): boolean {
    return this.handoffCalled;
  }

  getReconciliationOutput(): any {
    return this.reconciliationOutput;
  }

  resetState(): void {
    this.handoffCalled = false;
    this.reconciliationOutput = null;
  }
}

export default BlockersAgent;
