import { RunContext, tool } from "@openai/agents";
import { z } from "zod";
import { ExecutionContext } from "../../../../../execution_orchasterate/execution_context";
import { ExecutionArtifact } from "../../../../../../generated/prisma";
import BlockersService from "../../../../../../services/ai_services/blockers.services";

export const fetchOpenBlockers = tool({
  description: `
Fetch the current open blockers from the database.

This tool returns the authoritative list of existing blockers
for reconciliation purposes.

This is the ONLY source of truth for:
- blocker identity (id)
- current persisted state

Return an empty list if no blockers exist.
`,
  strict: true,
  parameters: z.object({}), // no input params allowed

  execute: async (
    _args,
    runContext?: RunContext<ExecutionContext>
  ): Promise<{ existing_blockers: ExecutionArtifact[] }> => {
    try {
      if (!runContext?.context) {
        return { existing_blockers: [] };
      }

      const blockersService = new BlockersService(runContext.context.meetingId);

      const blockers = await blockersService.getAllOpenBlockersByMeetingId();

      return { existing_blockers: blockers || [] };
    } catch {
      // 🔒 Safe degraded mode trigger
      return { existing_blockers: [] };
    }
  },
});
