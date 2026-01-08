import { RunContext, tool } from "@openai/agents";
import { z } from "zod";
import { ExecutionContext } from "../../../execution_orchasterate/execution_context";

import * as chrono from "chrono-node";
import { DateTime } from "luxon";

export const resolveDeadline = tool({
  description: `
Resolve a natural language deadline phrase into a concrete ISO date.

Use ONLY when a relative or natural deadline exists.
Return null if the date cannot be resolved safely.
`,
  strict: true,
  parameters: z.object({
    deadline_phrase: z.string().min(1),
  }),

  execute: async (
    { deadline_phrase },
    runContext?: RunContext<ExecutionContext>
  ): Promise<{ iso_date: string | null }> => {
    try {
      if (!runContext?.context) {
        return { iso_date: null };
      }

      const { currentDateTime, timezone } = runContext.context;

      if (!currentDateTime || !timezone) {
        return { iso_date: null };
      }

      const isoDate = resolveDeadlineReal(
        deadline_phrase,
        currentDateTime,
        timezone
      );

      return { iso_date: isoDate };
    } catch {
      return { iso_date: null };
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
