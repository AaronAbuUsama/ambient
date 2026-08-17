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
  test: { exclude: ["**/node_modules/**", "**/dist/**", ".spike-private/**"] },
  // Markdown is hand-wrapped prose: every doc here is an authority someone reads
  // top to bottom, and reflowing them makes every future diff unreadable. Source
  // is formatted; documents are written.
  //
  // Vendored skills are upstream source, not this project's program: reformatting our copy
  // diverges it for no gain, and it must not be edited at all. `.claude/skills/` is the
  // symlinked projection of `.agents/skills/`, so both names are listed — exclude one and
  // the tools find the same files by the other. We format and lint what we author.
  fmt: {
    ignorePatterns: ["**/*.md", ".agents/skills/vendor/**", ".agents/skills/install-anti-slop/**"],
  },
  lint: {
    // Type-checking an untouched vendored asset would also require its own devDependency
    // (`@oxlint/plugins`), which we do not have and should not add for code we never run.
    ignorePatterns: [
      ".agents/skills/vendor/**",
      ".claude/skills/vendor/**",
      ".agents/skills/install-anti-slop/**",
      ".claude/skills/install-anti-slop/**",
    ],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    // `no-explicit-any` is off by default, and "no `any`" is a rule we state —
    // docs/rules/types.md. A rule with no check is a hope.
    rules: { "vite-plus/prefer-vite-plus-imports": "error", "typescript/no-explicit-any": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
