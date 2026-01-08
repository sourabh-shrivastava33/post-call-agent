import { run, Runner } from "@openai/agents";
import { SourceType, TranscriptSegment } from "../../../generated/prisma";
import BaseAgent from "../baseAgent";
import { ORCHESTRATOR_INSTRUCTIONS } from "./orchestrator_agent_instructions";
import { OrchestratorOutputType } from "./orchestrator_agent_types";
import OrchestratorAgentConstants from "./constants";

class OrchestratorAgent extends BaseAgent {
  private runner: Runner;
  constructor() {
    super(
      OrchestratorAgentConstants.name,
      ORCHESTRATOR_INSTRUCTIONS,
      OrchestratorAgentConstants.model,
      OrchestratorOutputType,
      OrchestratorAgentConstants.modelSettings
    );
    this.runner = new Runner();
  }

  async analyzeTranscript(
    transcriptSegmentString: string
  ): Promise<typeof OrchestratorOutputType._type> {
    try {
      if (!transcriptSegmentString)
        throw new Error(
          "This workflow need transcripts to run. Please provide valid transcripts"
        );

      const agent = this.getAgent();

      const result = await this.runner.run(agent, transcriptSegmentString);
      const parsed = OrchestratorOutputType.parse(result.finalOutput);

      return parsed;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
export default OrchestratorAgent;
