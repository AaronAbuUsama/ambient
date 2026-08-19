/**
 * `throw` outside a test — [errors.md](../../docs/rules/errors.md).
 *
 * The word `throw` in a comment or a string is prose. This file writes it a dozen
 * times, is linted by its own rule, and passes: only a `throw` *statement* is a
 * throw. The line-level regex this replaces could not tell the two apart, and on
 * 2026-08-19 it failed the repository over a comment that read "the honest
 * fallback rather than a throw".
 */

import { defineRule } from "@oxlint/plugins";

/**
 * `testing.ts` counts as test code. It is a module's own scaffolding — the slot
 * `whatsappd/testing` occupies one layer down — imported by tests and by nothing
 * else, and a fixture that cannot fail loudly hides the failure inside the test
 * that depends on it.
 */
const isTest = (filename: string): boolean =>
  filename.endsWith(".test.ts") || filename.endsWith("/testing.ts");

/** Every failure is a declared value in `types.ts`; nothing outside a test throws. */
export const noThrowRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `throw` outside test files; every way a module can fail is a variant of a tagged union declared in its `types.ts`.",
    },
    messages: {
      throwOutsideTest: "a throw outside a test — a failure is a declared value, not an exception",
    },
  },
  createOnce(context) {
    return {
      ThrowStatement(node) {
        if (isTest(context.filename)) return;
        context.report({ node, messageId: "throwOutsideTest" });
      },
    };
  },
});
