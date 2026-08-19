import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  // `~/…` resolves from src/. A module names another module by what it IS
  // (`~/modules/home/types.ts`), never by how far away it happens to sit.
  resolve: { alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) } },
  // `.spike-private/` holds throwaway spikes and the archive-reader prototype,
  // which still imports a `#modules/chat-export` alias from when it lived under
  // `src/`. Collecting its tests made `vp test` report a failing FILE while every
  // test passed — a suite that is red for a reason unrelated to the code is a
  // suite people learn to ignore. Spikes are evidence, not tests.
  // `.claude/worktrees/` is a whole second checkout: collecting it runs every test twice and
  // reports doubled counts that look like new coverage.
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", ".spike-private/**", ".claude/worktrees/**"],
  },
  // Markdown is hand-wrapped prose: every doc here is an authority someone reads
  // top to bottom, and reflowing them makes every future diff unreadable. Source
  // is formatted; documents are written.
  //
  // Vendored skills are upstream source, not this project's program: reformatting our copy
  // diverges it for no gain, and it must not be edited at all. `.claude/skills/` is the
  // symlinked projection of `.agents/skills/`, so both names are listed — exclude one and
  // the tools find the same files by the other. We format and lint what we author.
  fmt: {
    ignorePatterns: ["**/*.md", ".agents/skills/vendor/**", "tools/**"],
  },
  lint: {
    // The vendored skills are upstream source we never run. `tools/` IS run — it is the
    // anti-slop plugin itself — but linting a plugin with itself is circular, so it is
    // ignored as a target while being loaded as a rule source.
    ignorePatterns: [".agents/skills/vendor/**", ".claude/skills/**", "tools/**"],
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "anti-slop", specifier: "./tools/index.ts" },
      // Our own contract — docs/rules/, at the AST rather than over a line. It sits under
      // `scripts/` rather than beside anti-slop in `tools/` precisely because `tools/` is
      // ignored above: anti-slop is upstream source we never edit, and these are ours, so
      // they are formatted, linted and type-checked like everything else we author.
      { name: "contract", specifier: "./scripts/lint/index.ts" },
    ],
    // `no-explicit-any` is off by default, and "no `any`" is a rule we state —
    // docs/rules/types.md. A rule with no check is a hope.
    //
    // anti-slop is installed from its vendored skill and every rule it ships is on. The
    // rules this repo already states in prose — no `any`, external data enters as `unknown`
    // and is narrowed at the boundary — are what several of these enforce at the AST rather
    // than by a regex over a line.
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "typescript/no-explicit-any": "error",
      "anti-slop/no-chained-type-assertions": "error",
      "anti-slop/no-conditional-empty-object-spread": "error",
      "anti-slop/no-known-value-widening": "error",
      "anti-slop/no-module-mocking": "error",
      "anti-slop/no-object-parameters": "error",
      "anti-slop/no-reflect-apply": "error",
      "anti-slop/no-reflect-get": "error",
      "anti-slop/no-runtime-typeof": "error",
      "anti-slop/no-shape-in-symbol-names": "error",
      "anti-slop/no-unknown-parameters": "error",
      "anti-slop/no-unknown-returns": "error",
      "anti-slop/no-unknown-type-aliases": "error",
      "anti-slop/no-unsafe-dictionary-type": "error",
      "anti-slop/no-widen-then-assert": "error",
      "anti-slop/require-safety-comment-for-type-assertion": "error",
      "contract/file-length": "error",
      "contract/no-foreign-internal": "error",
      "contract/no-relative-escape": "error",
      "contract/no-throw": "error",
    },
    options: { typeAware: true, typeCheck: true },
  },
});
