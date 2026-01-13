const BlockerItemsAgentConstants = {
  name: "Blocker Items Finding Agent",
  model: "gpt-5-nano",

  // Moderate reasoning and low verbosity with low randomness for reliable blocker detection
  modelSettings: {
    // For gpt-5-nano remove temperature/top_p; keep reasoning and token cap
    reasoning: { effort: "medium" },
    text: {
      verbosity: "low",
    },
    max_tokens: 1200,
  },

  confidenceThreshold: 0.7,
};

export default BlockerItemsAgentConstants;
