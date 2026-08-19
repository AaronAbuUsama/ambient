/**
 * This repository's own contract, as oxlint rules.
 *
 * The four checks that used to be a regex over a line in
 * [`shape.ts`](../shape.ts), asked of the syntax tree instead — because
 * `/\bthrow\b/` matches the word inside a comment, and that is the wrong
 * instrument for a rule about statements. Loaded by `vite.config.ts` beside
 * `anti-slop`, which is upstream source we never edit; these are ours, so they
 * live where `vp check` formats, lints and type-checks them.
 */

import { eslintCompatPlugin } from "@oxlint/plugins";

import { noThrowRule } from "./errors.ts";
import { noForeignInternalRule, noRelativeEscapeRule } from "./imports.ts";
import { fileLengthRule } from "./legibility.ts";

const contractPlugin = eslintCompatPlugin({
  meta: { name: "contract" },
  rules: {
    "file-length": fileLengthRule,
    "no-foreign-internal": noForeignInternalRule,
    "no-relative-escape": noRelativeEscapeRule,
    "no-throw": noThrowRule,
  },
});

export default contractPlugin;
