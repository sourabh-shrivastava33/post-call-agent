import { Runner } from "@openai/agents";
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

class ActionItemsAgent extends BaseAgent<ExecutionContext> {
  private runner: Runner;
  private attempts: number = 0;
  private runSuccess: boolean = false;

  constructor() {
    super(
      ActionItemsAgentConstants.name,
      ACTION_ITEM_AGENT_INSTRUCTION,
      ActionItemsAgentConstants.model,
      ActionItemsAgentOutputType,
      ActionItemsAgentConstants.modelSettings,
      [
        resolveDeadline as any, // 🔑 Tool registered here
      ]
    );

    this.runner = new Runner();
  }

  /**
   * Analyze transcript and extract execution-ready action items
   */
  // async analyzeTranscript(
  //   transcript: string,
  //   context: ExecutionContext
  // ): Promise<ActionItemsAgentOutput> {
  //   try {
  //     const agent = this.getAgent();
  //     let result;

  //     while (this.attempts < 3 && !this.runSuccess) {
  //       try {
  //         result = await this.runner.run(agent, transcript, {
  //           context,
  //         });
  //       } catch (error) {
  //         this.attempts += 1;
  //         if (this.attempts > 3) {
  //           logger.log("Max attempts reached for Action Items Agent");
  //         }
  //         continue;
  //       }
  //     }

  //     if (!result || (result && !result.finalOutput))
  //       return { action_items: [] };
  //     /**
  //      * Enforce schema at runtime
  //      * Any deviation = hard failure (as it should be)
  //      */
  //     let actionItemsAgentOutput = ActionItemsAgentOutputType.parse(
  //       result.finalOutput
  //     );

  //     // filter for the confidence threshold
  //     actionItemsAgentOutput = this.filterLowConfidenceItems(
  //       actionItemsAgentOutput
  //     );

  //     return actionItemsAgentOutput;
  //   } catch (error) {
  //     // Fail-safe behavior (do NOT throw orchestration-level errors)
  //     return { action_items: [] };
  //   }
  // }

  async analyzeTranscript(
    transcript: string,
    context: ExecutionContext
  ): Promise<ActionItemsAgentOutput> {
    const agent = this.getAgent();
    let attempts = 0;

    while (attempts < 3) {
      try {
        const result = await this.runner.run(
          agent,

          transcript,

          { context }
        );

        if (!result?.finalOutput) {
          return { action_items: [] };
        }

        let parsed = ActionItemsAgentOutputType.parse(result.finalOutput);

        parsed = this.filterLowConfidenceItems(parsed);
        return parsed;
      } catch (error) {
        attempts += 1;
        logger.warn(`ActionItemsAgent attempt ${attempts} failed`, error);
      }
    }

    logger.log("ActionItemsAgent failed after max retries");
    return { action_items: [] };
  }

  filterLowConfidenceItems(
    actionItems: ActionItemsAgentOutput
  ): ActionItemsAgentOutput {
    actionItems.action_items = actionItems.action_items.filter(
      (ai) => ai.confidence >= ActionItemsAgentConstants.confidenceThreshold
    );
    return actionItems;
  }
}

export default ActionItemsAgent;
