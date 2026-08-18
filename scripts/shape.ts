#!/usr/bin/env node
/**
 * The repo-shape check — `vp run shape`.
 *
 * AGENTS.md's legibility rules, made runnable. A rule that cannot be run is a
 * hope, so every rule stated there is asserted here, and every failure names the
 * file and the line so it can be opened rather than hunted for.
 *
 * Exit 0 is a clean repository; exit 1 prints one line per offence.
 */

import * as fs from "node:fs";

const REPO = `${import.meta.dirname}/..`;

/** No source file is longer than this. */
const LIMIT = 250;

/**
 * The declared exceptions, each with the reason it is not split. A file earns a
 * row here by being one thing that would be *less* legible in two files.
 */
const LONGER: Readonly<Record<string, string>> = {
  "src/modules/home/home.test.ts":
    "SKELETON's gate plus the `home` interface resolutions later areas add. " +
    "Splitting it for length would put part of the one interface gate in a file nobody knows to open.",
};

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

// ── source files ──────────────────────────────────────────────────────

for (const rel of sources) {
  const text = read(rel);
  const lines = text.split("\n");
  const count = lines.length - (text.endsWith("\n") ? 1 : 0);
  const owner = /^src\/modules\/([^/]+)\//.exec(rel)?.[1];
  const isTest = rel.endsWith(".test.ts");

  if (count > LIMIT && !(rel in LONGER)) {
    say(`${rel}:${LIMIT + 1}`, `${count} lines, over the ${LIMIT}-line limit`);
  }

  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    const other = /["']~\/modules\/([^/"']+)\/internal/.exec(line)?.[1];
    if (other !== undefined && other !== owner) {
      say(at, `imports \`${other}\`'s internal/ — internal is what only that module knows`);
    }
    if (/from ["']\.\.\/\.\.|import\(["']\.\.\/\.\./.test(line)) {
      say(at, "relative import out of the module — name it `~/modules/<name>/…` instead");
    }
    if (!isTest && /\bthrow\b/.test(line)) {
      say(at, "a throw outside a test — a failure is a declared value, not an exception");
    }
  });
}

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

// ── every designed module owns a row in seams.md ──────────────────────

/**
 * `new-module` refuses a module with no `seams.md` row — but that refusal is a
 * sentence in a skill file, so it has never once fired. Ticket 00 exists in both
 * slices that reached step 5 purely to copy rows a `design.md` had already
 * written. This is that ticket, as a check.
 *
 * It reads the delta rather than writing it. A generator cannot work here:
 * `design.md`'s third column is `Depends on` and `seams.md`'s is `Interface is
 * about`, so the one cell that matters would have to be invented.
 */
const named = (block: string): readonly string[] =>
  [...block.matchAll(/^\|\s*`([^`]+)`/gm)].flatMap((m) => (m[1] === undefined ? [] : [m[1]]));

/** The lines under the first heading matching `title`, up to the next heading. */
const under = (text: string, title: RegExp): string => {
  const lines = text.split("\n");
  const from = lines.findIndex((l) => /^#{1,6} /.test(l) && title.test(l));
  if (from === -1) return "";
  const rest = lines.slice(from + 1);
  const ends = rest.findIndex((l) => /^#{1,6} /.test(l));
  return (ends === -1 ? rest : rest.slice(0, ends)).join("\n");
};

const SEAMS = "docs/design/seams.md";
const rows = new Set(named(under(read(SEAMS), /The modules/)));

for (const rel of files.filter((f) => /^docs\/planning\/[^/]+\/design\.md$/.test(f))) {
  for (const name of named(under(read(rel), /Seam delta/))) {
    if (!rows.has(name)) say(rel, `§ Seam delta names \`${name}\`, which owns no row in ${SEAMS}`);
  }
}

for (const name of modules) {
  if (!rows.has(name)) say(`src/modules/${name}`, `is scaffolded but owns no row in ${SEAMS}`);
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
