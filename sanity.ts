import { run, Agent } from "@openai/agents";
import "dotenv/config";
const agent = new Agent({
  name: "sanity",
  instructions: "Return JSON { ok: true }",
  model: "gpt-4.1-mini",
});

async function main() {
  const result = await run(agent, "test");
  console.log("RESULT:", result.finalOutput);
}

main();
