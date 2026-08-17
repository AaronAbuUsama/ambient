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
  // `install-anti-slop` is vendored whole — its assets and installer belong to the skill
  // that ships them, and reformatting our copy diverges it from upstream for no gain. Named
  // rather than wildcarded, so a second vendored skill is a diff someone reviews. Our own
  // skills (`close-area`, `new-module`) are prose only and covered by the markdown line.
  // Same argument either way: we format what we author.
  fmt: { ignorePatterns: ["**/*.md", ".agents/skills/install-anti-slop/**"] },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    // `no-explicit-any` is off by default, and "no `any`" is a rule we state —
    // docs/rules/types.md. A rule with no check is a hope.
    rules: { "vite-plus/prefer-vite-plus-imports": "error", "typescript/no-explicit-any": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
