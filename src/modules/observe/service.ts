/** `observe` assembly. The interface is `types.ts`. */

import { peopleIn } from "./internal/person.ts";
import type { From, Unseen } from "./types.ts";

export const from: From = (lines) => peopleIn(lines);

/** Identity is `(type, name)` — a pair, never a path. `type` is one of six fixed
 * schema names and never contains a slash, so joining on one cannot collide. */
const keyOf = (type: string, name: string): string => type + "/" + name;

export const unseen: Unseen = (found, held) => {
  const known = new Set(held.map((document) => keyOf(document.type, document.name)));
  return found.filter((observation) => !known.has(keyOf(observation.type, observation.name)));
};
