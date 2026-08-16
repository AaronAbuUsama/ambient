import { defineConfig } from "vite-plus";

export default defineConfig({
  // Markdown is hand-wrapped prose: every doc here is an authority someone reads
  // top to bottom, and reflowing them makes every future diff unreadable. Source
  // is formatted; documents are written.
  fmt: { ignorePatterns: ["**/*.md"] },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
