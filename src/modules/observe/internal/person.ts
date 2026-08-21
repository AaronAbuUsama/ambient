/**
 * A `who.label` becomes a `Person` Observation. The only shape `observe` writes
 * today — `schema.yaml` has six types, and a script can be right about a
 * display label and nothing else on any of the other five.
 */

import type { Observation } from "~/modules/knowledge/types.ts";
import type { TranscriptLine } from "~/modules/transcript/types.ts";

/**
 * `aliases` and `numbers` are required by `Person` in `schema.yaml` and empty
 * here on purpose: an Archive line carries a display label and nothing else
 * ([`scope.md`](../../../../docs/planning/knowledge/scope.md) row 27 measured
 * this against `transcript/types.ts` directly) — an empty list is honest where
 * a guess would not be. `source: "history"` because every line this pass reads
 * is `from: "archive"`, never `"witnessed"`.
 */
const personOf = (label: string): Observation => ({
  type: "Person",
  name: label,
  frontmatter: { aliases: [], numbers: [], status: "unreviewed", source: "history" },
});

/**
 * One `Person` per distinct `who.label`, in first-seen order. Only
 * `from: "archive"` lines carry one — `LiveWho` has no `label`, only an
 * optional `pushName`, and no Live line has ever been written to a real home
 * ([`scope.md`](../../../../docs/planning/knowledge/scope.md) row: *"13,134 of
 * 13,134 are `from: "archive"`"*).
 */
export const peopleIn = (lines: readonly TranscriptLine[]): readonly Observation[] => {
  const seen = new Map<string, Observation>();
  for (const line of lines) {
    if (line.from !== "archive") continue;
    const label = line.who.label;
    if (!seen.has(label)) seen.set(label, personOf(label));
  }
  return [...seen.values()];
};
