/** Teach raw Node the same `~/` source alias used by TypeScript and Vite. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier.startsWith("~/")
        ? new URL(`../src/${specifier.slice(2)}`, import.meta.url).href
        : specifier,
      context,
    );
  },
});
