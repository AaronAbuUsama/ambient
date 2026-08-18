import * as fs from "node:fs/promises";

import type { Place } from "~/modules/home/types.ts";

/**
 * One writer per Transcript.
 *
 * `load()` … `replace()` is a read-modify-write. Two writers that both load before
 * either writes will each rename a complete file over the other's, so one set of
 * lines disappears and **both callers are told they succeeded**. That is defect D6,
 * and gate row 13 is the assertion.
 *
 * `wx` is the atomic primitive Node gives us — there is no `flock` in `node:fs`. A
 * holder that died leaves its file behind, so a lock older than `STALE_MS` is broken
 * rather than waited on; otherwise one SIGKILL wedges a Chat forever.
 *
 * Fail-fast, and deliberately: row 13 asks for *"both succeed with both sets present,
 * or one returns a failure"*, so there is nothing here worth queueing for.
 */
const STALE_MS = 30_000;

export type ReleaseLock = () => Promise<void>;

const claim = async (path: string): Promise<boolean> => {
  try {
    await (await fs.open(path, "wx")).close();
    return true;
  } catch {
    return false;
  }
};

/** `undefined` when another writer holds it. */
export const acquire = async (place: Place): Promise<ReleaseLock | undefined> => {
  const path = `${place.path}.lock`;
  const release: ReleaseLock = async () => {
    await fs.rm(path, { force: true }).catch(() => undefined);
  };

  if (await claim(path)) return release;

  const held = await fs.stat(path).catch(() => undefined);
  if (held === undefined || Date.now() - held.mtimeMs < STALE_MS) return undefined;
  await fs.rm(path, { force: true }).catch(() => undefined);
  return (await claim(path)) ? release : undefined;
};
