const FollowupAgentConstants = {
  name: "Client follow-up email agent",
  model: "gpt-4o",

  // Lower temperature and top_p for more consistent extraction; limit tokens to control cost
  modelSettings: {
    temperature: 0.15,
    top_p: 0.9,
    max_tokens: 1200,
    tool_choice: "required",
  },

  confidenceThreshold: 0.7,
};

export default FollowupAgentConstants;
