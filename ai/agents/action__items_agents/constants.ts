const ActionItemsAgentConstants = {
  name: "Action Items Finding Agent",
  model: "gpt-4o",

  modelSettings: {
    temperature: 0.2,
    top_p: 0.95,
    max_tokens: 2000,
  },

  confidenceThreshold: 0.5,
};

export default ActionItemsAgentConstants;
