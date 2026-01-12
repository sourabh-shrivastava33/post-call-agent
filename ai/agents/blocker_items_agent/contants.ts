const BlockerItemsAgentConstants = {
  name: "Blocker Items Finding Agent",
  model: "gpt-5-nano",

  modelSettings: {
    reasoning: { effort: "minimal" },
    text: {
      verbosity: "low",
    },
  },

  confidenceThreshold: 0.7,
};

export default BlockerItemsAgentConstants;
