/** `failure` assembly. The interface is `types.ts`. */

import { hasCode, messageOf } from "./internal/node-error.ts";
import type { CauseOf, IsMissing } from "./types.ts";

export const causeOf: CauseOf = messageOf;

/**
 * `ENOENT` is the one code named here rather than in `internal/`, because it is
 * the one a caller means: the file is not there. A module that needs a different
 * code should ask for a second question by name, not for the code itself.
 */
export const isMissing: IsMissing = (cause) => hasCode(cause, "ENOENT");
