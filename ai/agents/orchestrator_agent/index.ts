import { run, Runner } from "@openai/agents";
import { SourceType, TranscriptSegment } from "../../../generated/prisma";
import BaseAgent from "../baseAgent";
import { ORCHESTRATOR_INSTRUCTIONS } from "./orchestrator_agent_instructions";
import {
  OrchestratorDecisionSchema,
  OrchestratorOutputType,
} from "./orchestrator_agent_types";
import OrchestratorAgentConstants from "./constants";

class OrchestratorAgent extends BaseAgent {
  private runner: Runner;
  constructor() {
    super(
      OrchestratorAgentConstants.name,
      ORCHESTRATOR_INSTRUCTIONS,
      OrchestratorAgentConstants.model,
      OrchestratorOutputType,
      OrchestratorAgentConstants.modelSettings,
    );
    this.runner = new Runner();
  }

  async analyzeTranscript(
    transcriptSegmentString: string,
  ): Promise<OrchestratorDecisionSchema> {
    try {
      if (!transcriptSegmentString)
        throw new Error(
          "This workflow need transcripts to run. Please provide valid transcripts",
        );

      const agent = this.getAgent();
      const runnerInstance = new Runner();
      const result = await runnerInstance.run(agent, transcriptSegmentString);

      let finalOutput: any = result.finalOutput;
      if (typeof finalOutput === "string") {
        // Try to parse JSON output. Agents sometimes return stringified JSON
        // or include JSON inside a markdown code block.
        try {
          finalOutput = JSON.parse(finalOutput);
        } catch (err) {
          const jsonBlockMatch = finalOutput.match(/```json\s*([\s\S]*?)```/i);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            finalOutput = JSON.parse(jsonBlockMatch[1]);
          }
        }
      }

      const parsed = OrchestratorOutputType.parse(finalOutput);

      return parsed;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
export default OrchestratorAgent;
