import { handoff, Runner, RunContext } from "@openai/agents";
import BaseAgent from "../baseAgent";
import { ACTION_ITEM_AGENT_INSTRUCTION } from "./action_items_agent_instructions";
import {
  ActionItemsAgentOutputType,
  ActionItemsAgentOutput,
} from "./action_items_agent_types";
import { resolveDeadline } from "./tools/fetch_transcript";
import ActionItemsAgentConstants from "./constants";
import { ExecutionContext } from "../../execution_orchasterate/execution_context";
import { logger } from "../../../shared/logger";
import ReconciliationAgent from "../handoffs/action_items_agent_handoffs/reconciliation_agent";
import { ReconciliationsAgentOutputType } from "../handoffs/action_items_agent_handoffs/reconciliation_agent/reconciliation_agent.type";

class ActionItemsAgent extends BaseAgent<ExecutionContext> {
  private runner: Runner;
  private handoffCalled: boolean = false;
  private reconciliationOutput: any = null;

  constructor() {
    const reconciliationAgent = new ReconciliationAgent();

    super(
      ActionItemsAgentConstants.name,
      ACTION_ITEM_AGENT_INSTRUCTION,
      ActionItemsAgentConstants.model,
      undefined, // ❌ CHANGE THIS: Set to undefined to force handoff usage
      ActionItemsAgentConstants.modelSettings,
      [resolveDeadline as any],
      [
        handoff(reconciliationAgent.getAgent(), {
          // ✅ This tells the handoff what type to expect from ActionItemsAgent
          inputType: ActionItemsAgentOutputType,
          onHandoff: (ctx: RunContext, input?: ActionItemsAgentOutput) => {
            logger.log("✓ Handoff to ReconciliationAgent triggered");
            logger.log(
              `  Input being passed: ${JSON.stringify(input, null, 2)}`
            );
            logger.log(
              `  Action items count: ${input?.action_items?.length || 0}`
            );
            this.handoffCalled = true;
          },
        }),
      ]
    );

    this.runner = new Runner();
  }

  /**
   * Check if handoff was triggered in the last run
   */
  wasHandoffCalled(): boolean {
    return this.handoffCalled;
  }

  /**
   * Get the ReconciliationAgent output after handoff
   */
  getReconciliationOutput(): any {
    return this.reconciliationOutput;
  }

  /**
   * Reset flags for next execution
   */
  resetHandoffFlag(): void {
    this.handoffCalled = false;
    this.reconciliationOutput = null;
  }

  async analyzeTranscript(
    transcript: string,
    context: ExecutionContext
  ): Promise<ActionItemsAgentOutput> {
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
          return {
            action_items: [],
            confidence: 0,
            warnings: ["empty_agent_output"],
          };
        }

        // ✅ Parse finalOutput if it's a string (JSON) - Agent.create() returns strings
        let parsedOutput = result.finalOutput;
        if (typeof parsedOutput === "string") {
          try {
            parsedOutput = JSON.parse(parsedOutput);
            logger.log("✓ Successfully parsed JSON string output");
          } catch (e) {
            logger.warn("Failed to parse JSON output:", parsedOutput);
            throw new Error("Invalid JSON output from agent");
          }
        }

        logger.log(`Parsed output: ${JSON.stringify(parsedOutput, null, 2)}`);
        logger.log(`Handoff called flag: ${this.handoffCalled}`);

        // ✅ Try to parse as ReconciliationAgent output first (handoff occurred)
        try {
          const reconciliationResult =
            ReconciliationsAgentOutputType.parse(parsedOutput);

          logger.log("✓ Successfully parsed as ReconciliationAgent output");
          logger.log(
            `  Items to add: ${
              reconciliationResult.action_items.add?.length || 0
            }`
          );
          logger.log(
            `  Items to update: ${
              reconciliationResult.action_items.update?.length || 0
            }`
          );

          this.reconciliationOutput = reconciliationResult;

          return this.reconciliationOutput;
        } catch (reconciliationParseError) {
          // Not ReconciliationAgent output, try ActionItemsAgent output
          logger.log(
            "Not ReconciliationAgent output, trying ActionItemsAgent schema"
          );

          try {
            const parsed = ActionItemsAgentOutputType.parse(parsedOutput);
            logger.warn(
              "⚠️ WARNING: Parsed as ActionItemsAgent output - handoff did NOT occur!"
            );
            logger.warn(
              "This means the AI returned output directly instead of calling handoff."
            );
            return parsed;
          } catch (actionItemsParseError) {
            logger.warn("Failed to parse output as either schema:", {
              output: parsedOutput,
              reconciliationError: reconciliationParseError,
              actionItemsError: actionItemsParseError,
            });
            throw actionItemsParseError;
          }
        }
      } catch (error) {
        attempts += 1;
        logger.warn(`ActionItemsAgent attempt ${attempts} failed:`, error);

        // On last attempt, log more details
        if (attempts === 3) {
          logger.warn("Max retries reached. Last error:", error);
        }
      }
    }

    logger.warn("ActionItemsAgent failed after max retries");

    // 🔒 Always return schema-valid fallback
    return {
      action_items: [],
      confidence: 0,
      warnings: ["agent_failed_after_retries"],
    };
  }
}

export default ActionItemsAgent;
