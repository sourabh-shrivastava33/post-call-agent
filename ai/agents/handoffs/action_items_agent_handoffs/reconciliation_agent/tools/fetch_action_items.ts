import { RunContext, tool } from "@openai/agents";
import { z } from "zod";
import { ExecutionContext } from "../../../../../execution_orchasterate/execution_context";

import * as chrono from "chrono-node";
import { DateTime } from "luxon";
import { ExecutionArtifact } from "../../../../../../generated/prisma";
import ActionItemsServices from "../../../../../../services/ai_services/action_items.services";

export const fetchOpenActionItems = tool({
  description: `
Fetch the current open action items from the database.

This tool returns the authoritative list of existing action items
for reconciliation purposes.

This is the ONLY source of truth for:
- action item identity (id)
- current persisted state

Return an empty list if no action items exist.
`,
  strict: true,
  parameters: z.object({}),

  execute: async (
    _args,
    runContext?: RunContext<ExecutionContext>
  ): Promise<{ existing_action_items: ExecutionArtifact[] }> => {
    try {
      if (!runContext?.context) {
        return { existing_action_items: [] };
      }
      const actionItemsService = new ActionItemsServices(
        runContext.context.meetingId
      );

      //   return { iso_date: isoDate };
      const actionItems =
        await actionItemsService.getAllActionItemsByMeetingId();

      return { existing_action_items: actionItems || [] };
    } catch {
      return { existing_action_items: [] };
    }
  },
});

/**
 * Resolve a natural language deadline phrase into an ISO date (YYYY-MM-DD)
 * Returns null if resolution is unsafe or ambiguous.
 */
export function resolveDeadlineReal(
  phrase: string,
  currentDateTime: string,
  timezone: string
): string | null {
  try {
    // Anchor date in correct timezone
    const reference = DateTime.fromISO(currentDateTime, {
      zone: timezone,
    });

    if (!reference.isValid) return null;

    // Parse using chrono with forward-date bias
    const results = chrono.parse(phrase, reference.toJSDate(), {
      forwardDate: true,
    });

    if (!results || results.length === 0) {
      return null;
    }

    const result = results[0];

    // If chrono is unsure → reject
    if (!result.start || !result.start.isCertain("day")) {
      return null;
    }

    const resolvedDate = DateTime.fromJSDate(result.start.date(), {
      zone: timezone,
    });

    // Reject past dates
    if (resolvedDate < reference.startOf("day")) {
      return null;
    }

    // Normalize to date only (execution systems want dates, not times)
    return resolvedDate.toISODate(); // YYYY-MM-DD
  } catch {
    return null;
  }
}
