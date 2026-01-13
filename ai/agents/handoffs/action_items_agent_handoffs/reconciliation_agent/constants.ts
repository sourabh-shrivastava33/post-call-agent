const ReconciliationAgentConstants = {
  name: "Reconciliation Agent",
  model: "gpt-5-nano",

  // Reconciliation must be conservative and deterministic — very low temperature
  modelSettings: {
    // gpt-5-nano: avoid unsupported sampling params; keep deterministic reasoning
    reasoning: { effort: "medium" },
    text: {
      verbosity: "low",
    },
    max_tokens: 1500,
  },

  confidenceThreshold: 0.7,
};

export default ReconciliationAgentConstants;
