#!/usr/bin/env node
/**
 * The repo-shape check — `vp run shape`.
 *
 * The rules under `docs/rules/` that no linter can see: the six slots and a stale
 * exception row, which are questions about the filesystem, and the seam map and
 * cross-links, which are questions about many documents at once. Everything that
 * is a question about one source file is an oxlint rule under
 * [`lint/`](./lint/index.ts) and runs under `vp check` — a line-level regex is
 * the wrong instrument for a rule about syntax.
 *
 * A rule that cannot be run is a hope, so every failure names the file and the
 * line so it can be opened rather than hunted for. This file is the composition
 * root and nothing else: it walks the tree, hands what it read to the checks in
 * [`shape/checks.ts`](./shape/checks.ts), prints and exits. The checks are
 * functions of their inputs, so [`shape/checks.test.ts`](./shape/checks.test.ts)
 * can ask them the questions a repository never happens to pose — a roadmap of
 * exactly its own cap, a file with no terminating newline.
 *
 * Exit 0 is a clean repository; exit 1 prints one line per offence.
 */

import * as fs from "node:fs";

import { LONGER } from "./lint/legibility.ts";
import {
  brokenLinks,
  missingSeamRows,
  missingSlots,
  overCap,
  staleExceptions,
} from "./shape/checks.ts";

const REPO = `${import.meta.dirname}/..`;

/**
 * Directories a repository check has no business walking.
 *
 * `worktrees` is a whole second checkout under `.claude/`. Walking it double-counts every
 * file and reports a document's links as broken purely because the copy sits deeper in the
 * tree — a failure about where a checkout is, not about anything anyone wrote.
 */
const SKIP = new Set([
  "node_modules",
  ".git",
  ".fallow",
  ".vscode",
  "dist",
  "worktrees",
  // Upstream skills, copied whole and never edited. Their cross-links are their author's
  // business, and one of them is already broken upstream — policing it would leave us
  // choosing between a red check and editing a file the vendor rule forbids touching.
  // Same line as `fmt` and `lint` draw: we check what we author.
  "vendor",
]);

const walk = (rel: string): readonly string[] => {
  const found: string[] = [];
  for (const entry of fs.readdirSync(`${REPO}/${rel}`, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const child = rel === "" ? entry.name : `${rel}/${entry.name}`;
    if (entry.isDirectory()) found.push(...walk(child));
    else found.push(child);
  }
  return found;
};

const read = (rel: string): string => fs.readFileSync(`${REPO}/${rel}`, "utf8");
const exists = (rel: string): boolean => fs.existsSync(`${REPO}/${rel}`);

const SEAMS = "docs/design/seams.md";
const ROADMAP = "docs/design/roadmap.md";

const files = walk("");
const sources = files.filter((f) => f.startsWith("src/") && f.endsWith(".ts"));
const modules = fs
  .readdirSync(`${REPO}/src/modules`, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);
const designs = new Map(
  files
    .filter((f) => /^docs\/planning\/[^/]+\/design\.md$/.test(f))
    .map((rel) => [rel, read(rel)] as const),
);

const offences = [
  ...staleExceptions(Object.keys(LONGER), sources),
  ...missingSlots(modules, exists),
  ...missingSeamRows(modules, read(SEAMS), designs),
  ...overCap(ROADMAP, read(ROADMAP)),
  ...files.filter((f) => f.endsWith(".md")).flatMap((rel) => brokenLinks(rel, read(rel), exists)),
];

// ── the report ────────────────────────────────────────────────────────

for (const o of [...offences].sort((a, b) => (a.at < b.at ? -1 : 1))) {
  process.stdout.write(`${o.at}: ${o.said}\n`);
}
process.stdout.write(
  offences.length === 0
    ? `shape: ${String(sources.length)} source files, ${String(modules.length)} modules, clean\n`
    : `shape: ${String(offences.length)} problems\n`,
);
process.exit(offences.length === 0 ? 0 : 1);
