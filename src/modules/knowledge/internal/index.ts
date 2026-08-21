/**
 * The derived index: rows and counts, built from the documents `base.all()`
 * already returned, and the one write outside the base.
 *
 * **`buildIndex` is pure.** The same sorted documents produce the same object
 * every time, which — together with `writeIndexTo`'s deterministic encoding —
 * is what lets deleting `home.index` and rebuilding reproduce it byte for
 * byte ([design.md § B2](../../../../docs/planning/knowledge/design.md)).
 *
 * **The one write here.** Temp-then-rename in the index's own directory, so
 * the file is old or new and never torn — the same shape `blobs.put` and
 * `home`'s own `writeNew` use, for the reason ADR 007 gives for every write in
 * this Slice: a non-atomic edit registers a phantom document in
 * OpenKnowledge's removal ledger.
 */

import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";

import { causeOf } from "~/modules/failure/service.ts";
import type { Place } from "~/modules/home/types.ts";
import type { Document, Index, IndexProblem, IndexRow, Written } from "../types.ts";

/** `docs` arrives sorted by `at` — `readAll`'s own invariant — so row and count order is stable. */
export const buildIndex = (docs: readonly Document[]): Index => {
  const documents: IndexRow[] = docs.map((doc) => ({ at: doc.at, type: doc.type, name: doc.name }));
  // A `Map`, because a type name is an open vocabulary and a plain object is not one:
  // `schema.yaml` may declare `constructor`, whose lookup finds `Object.prototype`'s and
  // counts to "function Object() { [native code] }11", or `__proto__`, which assigns the
  // prototype instead of a key and vanishes from the JSON. `Object.fromEntries` defines
  // both as ordinary own properties.
  const counts = new Map<string, number>();
  for (const doc of docs) counts.set(doc.type, (counts.get(doc.type) ?? 0) + 1);
  return { documents, counts: Object.fromEntries(counts) };
};

export const writeIndexTo = async (place: Place, built: Index): Promise<Written | IndexProblem> => {
  const text = `${JSON.stringify(built, null, 2)}\n`;
  // A sibling of `place.path` itself, never `node:path` — only `home` joins a
  // path (ADR 001's escrow rule; `home.test.ts` row 16 checks it repo-wide).
  const tmp = `${place.path}.tmp-${randomUUID()}`;
  try {
    await fs.writeFile(tmp, text, { encoding: "utf8", flag: "wx" });
    await fs.rename(tmp, place.path);
    return { bytes: Buffer.byteLength(text, "utf8") };
  } catch (cause: unknown) {
    // The write already failed; a failure to clear the temp file cannot say
    // anything the caller does not already know, and must not mask it.
    await fs.rm(tmp, { force: true }).catch(() => undefined);
    return { problems: [{ cause: causeOf(cause) }] };
  }
};
