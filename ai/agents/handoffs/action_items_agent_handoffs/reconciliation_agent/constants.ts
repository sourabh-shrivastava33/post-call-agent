const ReconciliationAgentConstants = {
  name: "Reconciliation Agent",
  model: "gpt-5-nano",

  modelSettings: {
    reasoning: { effort: "minimal" },
    text: {
      verbosity: "low",
    },
  },

  confidenceThreshold: 0.6,
};

export default ReconciliationAgentConstants;
