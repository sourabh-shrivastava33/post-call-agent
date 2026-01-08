import { Agent, run, Tool } from "@openai/agents";

abstract class BaseAgent<TContext = void> {
  protected agent: Agent<TContext>;
  protected context!: TContext;
  constructor(
    protected readonly name: string,
    protected readonly instructions: string,
    protected readonly model: string = "gpt-4o",
    protected readonly outputType?: any,
    protected readonly modelSettings?: any,
    protected readonly tools?: Tool[]
  ) {
    this.agent = new Agent<TContext>({
      name: this.name,
      instructions: this.instructions,
      model: this.model,
      outputType: this.outputType,
      modelSettings: this.modelSettings,
      tools: tools,
    });
  }

  getAgent(): Agent<TContext> {
    return this.agent;
  }

  async runWithContext(input: string, context: TContext) {
    try {
      const agent = this.getAgent();
      return await run(agent, input, { context });
    } catch (error) {
      throw new Error("Error while running agents with context");
    }
  }
}

export default BaseAgent;
