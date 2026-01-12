import { Agent, run, Tool, Handoff } from "@openai/agents";

abstract class BaseAgent<TContext = void> {
  protected agent: Agent<TContext>;
  protected context!: TContext;

  constructor(
    protected readonly name: string,
    protected readonly instructions: string,
    protected readonly model: string = "gpt-4o",
    protected readonly outputType?: any,
    protected readonly modelSettings?: any,
    protected readonly tools?: Tool[],
    protected readonly handoffs?: (Agent<any> | Handoff<any>)[]
  ) {
    // ✅ CRITICAL FIX: Use Agent.create() instead of new Agent()
    // This properly handles type-safe handoffs

    // Build the config object conditionally
    const config: any = {
      name: this.name,
      instructions: this.instructions,
      model: this.model,
      modelSettings: this.modelSettings,
      tools: this.tools || [],
      handoffs: this.handoffs || [],
    };

    // Only add output if outputType is provided
    if (this.outputType) {
      config.output = this.outputType;
    }

    this.agent = Agent.create(config) as Agent<TContext>;
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
