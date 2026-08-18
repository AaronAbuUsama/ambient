/**
 * Resolving a Source name to the Places a Live verb needs.
 *
 * All three Live verbs do the same three things before they do anything else:
 * check the Source is configured, ask `home` for its two Places, and refuse in
 * `home`'s own words if either is denied. Written once, because written three
 * times it drifted immediately — the same shape as `import`'s handler reaching
 * 176 lines by accumulation.
 */

import type { Account } from "~/modules/channel/types.ts";
import { describe as describeHome } from "~/modules/home/service.ts";
import type { Home } from "~/modules/home/types.ts";
import type { Outcome } from "../types.ts";
import { message, report } from "./command.ts";

/** Narrow with `"kind" in resolved`: an `Outcome` is the refusal. */
export const accountOf = (home: Home, name: string): Account | Outcome => {
  const global = home.read();
  if ("problems" in global) return report(global.problems);
  if (!global.sources.some((source) => source.name === name)) {
    const known = global.sources.map((source) => source.name).join(", ");
    return message(
      false,
      `Source "${name}" is not in config.yaml${known === "" ? "" : `; known sources: ${known}`}`,
    );
  }

  const handle = home.source(name);
  const store = handle.store();
  if ("problems" in store) return message(false, store.problems.map(describeHome).join("; "));
  const media = handle.media();
  if ("problems" in media) return message(false, media.problems.map(describeHome).join("; "));
  return { name, store, media };
};
