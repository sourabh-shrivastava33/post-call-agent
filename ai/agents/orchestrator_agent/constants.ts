const OrchestratorAgentConstants = {
  name: "Orchestrator Agent",
  model: "gpt-5-nano",
  // Deterministic, moderate reasoning to balance quality and cost
  modelSettings: {
    // Use reasoning effort and low verbosity for deterministic orchestration
    reasoning: { effort: "medium" },
    text: {
      verbosity: "low",
    },
    max_tokens: 1500,
  },
};

export default OrchestratorAgentConstants;
