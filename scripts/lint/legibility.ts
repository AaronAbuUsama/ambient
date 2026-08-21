/**
 * The 250-line limit and its declared exceptions —
 * [legibility.md](../../docs/rules/legibility.md).
 *
 * `LONGER` lives here rather than in the checker that reads the tree because two
 * things need it: this rule, which is told about one file at a time, and
 * [`shape.ts`](../shape.ts), which can see that a declared row names a file that
 * no longer exists. A stale row is itself an offence, and only a walk of the tree
 * can say so.
 */

import { defineRule } from "@oxlint/plugins";

/** No source file under `src/` is longer than this. */
const LIMIT = 250;

/**
 * The declared exceptions, each with the reason it is not split. A file earns a
 * row here by being one thing that would be *less* legible in two files.
 */
export const LONGER = {
  "src/modules/home/types.ts":
    "THE interface of the module every other module writes through — the values, the four " +
    "handles and the whole failure vocabulary, answerable in one read. It sat at exactly 250 " +
    "until KNOWLEDGE added `home.knowledge`, `home.index` and `Source.self_label`, which even " +
    "uncommented is 253: the only split available is a seventh file at a module root, and that " +
    "is not one of the six slots.",
  "src/modules/home/home.test.ts":
    "SKELETON's gate plus the `home` interface resolutions later areas add. " +
    "Splitting it for length would put part of the one interface gate in a file nobody knows to open.",
  "src/modules/transcript/transcript.test.ts":
    "Gate rows 11-13 and the roundtrip gate are one gate on one file format — row 11 asserts " +
    "the inode the roundtrip rows extend. Splitting it would put half the Transcript gate in a " +
    "file nobody knows to open, and a seventh file at a module root is not one of the six slots.",
};

/** The path from the repository root, for a file under `src/`, and nothing else. */
const underSrc = (filename: string): string | undefined => {
  const at = filename.lastIndexOf("/src/");
  return at === -1 ? undefined : filename.slice(at + 1);
};

/** 250 lines is where a file stops being readable in one sitting. */
export const fileLengthRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a source file under `src/` longer than 250 lines, unless it owns a row in the declared exception list with its reason.",
    },
    messages: {
      tooLong: "{{count}} lines, over the {{limit}}-line limit",
    },
  },
  createOnce(context) {
    return {
      Program() {
        const rel = underSrc(context.filename);
        if (rel === undefined || Object.hasOwn(LONGER, rel)) return;
        const lines = context.sourceCode.lines;
        const count = lines.length - (lines.at(-1) === "" ? 1 : 0);
        if (count <= LIMIT) return;
        context.report({
          loc: { line: LIMIT + 1, column: 0 },
          messageId: "tooLong",
          data: { count: String(count), limit: String(LIMIT) },
        });
      },
    };
  },
});
