const ActionItemsAgentConstants = {
  name: "Action Items Finding Agent",
  model: "gpt-4o",

  // Lower temperature and top_p for more consistent extraction; limit tokens to control cost
  modelSettings: {
    temperature: 0.15,
    top_p: 0.9,
    max_tokens: 1200,
  },

  confidenceThreshold: 0.7,
};

export default ActionItemsAgentConstants;
