import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  // `~/…` resolves from src/. A module names another module by what it IS
  // (`~/modules/home/types.ts`), never by how far away it happens to sit.
  resolve: { alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Markdown is hand-wrapped prose: every doc here is an authority someone reads
  // top to bottom, and reflowing them makes every future diff unreadable. Source
  // is formatted; documents are written.
  fmt: { ignorePatterns: ["**/*.md"] },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    // `no-explicit-any` is off by default, and "no `any`" is a rule we state —
    // docs/rules/types.md. A rule with no check is a hope.
    rules: { "vite-plus/prefer-vite-plus-imports": "error", "typescript/no-explicit-any": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
