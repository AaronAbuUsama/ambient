/**
 * `observe` — the mechanical pass: Transcript Lines to Observations, minus what
 * the knowledge base already holds.
 *
 * THE interface. Read this file alone and you know what `observe` is.
 * `service.ts` implements it; `internal/` is what only `observe` knows.
 *
 * **No model, no clock.** Both functions below are pure — a list in, a list
 * out — because anything a script can be wrong about, a script must not do
 * ([`knowledge-flow.md`](../../../docs/design/knowledge-flow.md)). Naming a
 * person, merging two labels, or resolving a relative date is a reasoning
 * pass's job, and none of it happens here.
 *
 * **`Observation` lives in `~/modules/knowledge/types.ts`, not here.** A `Base`
 * is what validates one and turns it into a `Document`, so the shape belongs
 * with the thing that checks it — `observe` only produces the list.
 *
 * **There is no `observe.run`.** The order of the writes — `from`, then
 * `unseen`, then one `knowledge.write` — is owned by the caller,
 * [`cli.observe`](../cli/internal/commands/observe.ts): three calls in a row
 * are not an operation with a crash story of their own to hide, and a
 * pass-through wrapper here would only be a second place that order could go
 * stale against the one that actually runs it.
 */

import type { Document, Observation } from "~/modules/knowledge/types.ts";
import type { TranscriptLine } from "~/modules/transcript/types.ts";

/**
 * Lines to Observations. **Pure** — one Observation per distinct sender label
 * found, in first-seen order. Only `from: "archive"` lines carry one: a Live
 * line's `who` has no label, only a `pushName` WhatsApp itself calls optional.
 */
export type From = (lines: readonly TranscriptLine[]) => readonly Observation[];

/**
 * `found` minus whatever `held` already carries. **Pure**, and identity is
 * `(type, name)` — **never `at`**: refusing by filename silently duplicates,
 * which is exactly what protects a hand-edited document on a second run.
 */
export type Unseen = (
  found: readonly Observation[],
  held: readonly Document[],
) => readonly Observation[];
