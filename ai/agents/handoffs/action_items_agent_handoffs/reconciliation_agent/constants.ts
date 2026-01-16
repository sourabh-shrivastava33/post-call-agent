const ReconciliationAgentConstants = {
  name: "Reconciliation Agent",
  model: "gpt-5-mini",

  // Reconciliation must be conservative and deterministic — very low temperature
  modelSettings: {
    // gpt-5-nano: avoid unsupported sampling params; keep deterministic reasoning
    reasoning: { effort: "medium" },
    text: {
      verbosity: "low",
    },
    tool_choice: "required",
    max_tokens: 1500,
  },

  confidenceThreshold: 0.7,
};

export default ReconciliationAgentConstants;
