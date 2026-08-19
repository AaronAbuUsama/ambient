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
 * line so it can be opened rather than hunted for.
 *
 * Exit 0 is a clean repository; exit 1 prints one line per offence.
 */

import * as fs from "node:fs";

import { LONGER } from "./lint/legibility.ts";

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

type Offence = { readonly at: string; readonly said: string };

const offences: Offence[] = [];
const say = (at: string, said: string): void => {
  offences.push({ at, said });
};

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

const files = walk("");
const sources = files.filter((f) => f.startsWith("src/") && f.endsWith(".ts"));

// ── no length exception outlives the file it excuses ──────────────────

/**
 * `contract/file-length` is told about one file at a time, so it can honour a row
 * but never notice that the file it names is gone. A row nobody can reach is an
 * excuse standing over nothing, which is how an exception list decays into a
 * blanket. Only a walk of the tree can say so.
 */
for (const rel of Object.keys(LONGER)) {
  if (!sources.includes(rel)) say(rel, "declared as a length exception, but no such source file");
}

// ── every module has all six slots ────────────────────────────────────

const modules = fs
  .readdirSync(`${REPO}/src/modules`, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

for (const name of modules) {
  const slots = ["README.md", "types.ts", "service.ts", "internal", `${name}.test.ts`];
  for (const slot of slots) {
    if (!fs.existsSync(`${REPO}/src/modules/${name}/${slot}`)) {
      say(`src/modules/${name}/${slot}`, "missing — every module has all six slots");
    }
  }
}

// ── every module owns a row in the seam map ───────────────────────────

/**
 * The row in `seams.md` is what makes a directory a module — `new-module`
 * refuses to scaffold one without it. Nothing enforced that: for the whole of
 * INGEST's steps 1-4, `ingest` was a module in `design.md`, in the call graph
 * and in five tickets, owned no row, and this check printed `clean` on every
 * one of those days. Ticket `00` in both IMPORT and INGEST existed only to
 * write those rows by hand — it is this missing check with a number on it.
 */
const declared = new Set(
  [...read("docs/design/seams.md").matchAll(/^\|\s*`([a-z-]+)`\s*\|/gm)].map(([, n]) => n),
);

/** Module → the place that claims it is one, for the offence to point at. */
const claimed = new Map<string, string>(modules.map((name) => [name, `src/modules/${name}`]));

for (const rel of files.filter((f) => /^docs\/planning\/[^/]+\/design\.md$/.test(f))) {
  let inDelta = false;
  for (const line of read(rel).split("\n")) {
    if (line.startsWith("## ")) inDelta = line.startsWith("## Seam delta");
    if (!inDelta) continue;
    const named = /^\|\s*`([a-z-]+)`\s*\|/.exec(line)?.[1];
    if (named !== undefined && !claimed.has(named)) claimed.set(named, rel);
  }
}

for (const [name, where] of [...claimed].sort(([a], [b]) => (a < b ? -1 : 1))) {
  if (!declared.has(name)) {
    say(
      where,
      `\`${name}\` owns no row in docs/design/seams.md — the row is what makes it a module`,
    );
  }
}

// ── every cross-link in a document resolves ───────────────────────────

/** Fenced blocks and inline code are illustration, not links to follow. */
const prose = (text: string): string =>
  text
    .replaceAll(/^```[\s\S]*?^```/gm, (b) => b.replaceAll(/[^\n]/g, " "))
    .replaceAll(/`[^`\n]*`/g, "");

for (const rel of files.filter((f) => f.endsWith(".md"))) {
  const dir = new URL(`file://${REPO}/${rel}`);
  prose(read(rel))
    .split("\n")
    .forEach((line, i) => {
      for (const [, link] of line.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (link === undefined || /^(https?:|mailto:|#)/.test(link)) continue;
        // `#frag` and a trailing `:NN` line anchor are both anchors INTO a file,
        // not part of its path. `file.md:38` is the citation form this repo asks
        // for everywhere — the checker rejecting it made the documented style
        // illegal, which is the checker being wrong rather than the document.
        const path = (link.split("#")[0] ?? "").replace(/:\d+(-\d+)?$/, "");
        const target = new URL(path, dir);
        if (target.pathname !== dir.pathname && !fs.existsSync(target)) {
          say(`${rel}:${i + 1}`, `links to \`${link}\`, which does not exist`);
        }
      }
    });
}

// ── the report ────────────────────────────────────────────────────────

for (const o of offences.sort((a, b) => (a.at < b.at ? -1 : 1))) {
  process.stdout.write(`${o.at}: ${o.said}\n`);
}
process.stdout.write(
  offences.length === 0
    ? `shape: ${String(sources.length)} source files, ${String(modules.length)} modules, clean\n`
    : `shape: ${String(offences.length)} problems\n`,
);
process.exit(offences.length === 0 ? 0 : 1);
