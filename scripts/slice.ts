#!/usr/bin/env node
/**
 * Where a Slice is, read off its files — `vp run slice <SLICE>`.
 *
 * [slices.md](../docs/rules/slices.md) names six steps and gates each one, and
 * nothing knew which step a Slice was on. So every session began by a human
 * reconstructing it from memory, and one step ran without regenerating the page
 * because no step knew it was a step. Deficit 10.
 *
 * The state is not a judgement. It is a function of what is on disk, and this
 * file is that function so an agent never has to guess it.
 *
 * Exit 0 always: this reports, it does not police.
 */

import * as fs from "node:fs";

const REPO = `${import.meta.dirname}/..`;
const slug = (process.argv[2] ?? "").toLowerCase();
if (slug === "") {
  console.error("usage: vp run slice <SLICE>");
  process.exit(2);
}

const DIR = `${REPO}/docs/planning/${slug}`;
if (!fs.existsSync(DIR)) {
  console.log(`${slug.toUpperCase()} — no directory at docs/planning/${slug}/`);
  console.log(`  A Slice starts when \`map-slice\` writes its scope.md. Check the name against`);
  console.log(`  the status board in docs/design/roadmap.md.`);
  process.exit(0);
}

/**
 * The roadmap's status board is the authority on closed, not the files. SKELETON
 * and IMPORT closed before this rule existed and have no scope.md at all, so a
 * ladder that reads files alone reports them at step 1 — which it did, until
 * looking at the output said otherwise.
 */
const board = fs.readFileSync(`${REPO}/docs/design/roadmap.md`, "utf8");
const row = new RegExp(`^\\|\\s*\\*\\*${slug.toUpperCase()}\\*\\*\\s*\\|\\s*([●◐○])`, "im").exec(
  board,
);
const closed = row?.[1] === "●";
const has = (f: string): boolean => fs.existsSync(`${DIR}/${f}`);
const read = (f: string): string => (has(f) ? fs.readFileSync(`${DIR}/${f}`, "utf8") : "");

/** The body of one `## Heading`, up to the next `## `. */
const section = (text: string, heading: string): string => {
  const start = text.indexOf(`\n## ${heading}`);
  if (start === -1) return "";
  const rest = text.slice(start + 1);
  const end = rest.indexOf("\n## ", 1);
  return end === -1 ? rest : rest.slice(0, end);
};

/**
 * An open question is a line whose first token is an id — `R1`, `S2a`, `G7`.
 * Answered ones keep their id and gain a marker, so the id alone is not enough:
 * a line naming its own resolution is not open.
 */
const RESOLVED = /\b(ANSWERED|DISSOLVED|RETIRED|CLOSED|WITHDRAWN)\b/;
const openQuestions = (scope: string): string[] =>
  section(scope, "Open")
    .split("\n")
    .filter((l) => /^[RSTG]\d+[a-z]?\s/.test(l.trim()))
    .filter((l) => !RESOLVED.test(l));

/** A fog patch is a top-level bullet. A table saying it cleared is not one. */
const fogPatches = (scope: string): string[] =>
  section(scope, "Fog")
    .split("\n")
    .filter((l) => l.startsWith("- "));

const tickets = (): { file: string; status: string }[] => {
  const dir = `${DIR}/issues`;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({
      file: f,
      status:
        /\*\*Status:\*\*\s*([a-z-]+)/.exec(fs.readFileSync(`${dir}/${f}`, "utf8"))?.[1] ?? "?",
    }));
};

const scope = read("scope.md");
const open = openQuestions(scope);
const fog = fogPatches(scope);
const issues = tickets();
const undone = issues.filter((t) => t.status !== "done" && t.status !== "wontfix");

type Step = { n: number; name: string; skill: string; why: string };

/**
 * Read DOWN from the most advanced artefact, never up from the first one
 * missing. A Slice that closed before this rule existed has a spec and no
 * scope, and working up reports it at step 1.
 */
const step = ((): Step => {
  if (closed) return { n: 6, name: "Close", skill: "— nothing", why: "the roadmap says closed" };
  if (has("spec.md")) {
    if (issues.length === 0)
      return { n: 4, name: "Plan", skill: "plan-slice", why: "spec.md exists, no tickets yet" };
    if (undone.length > 0)
      return {
        n: 5,
        name: "Build",
        skill: "new-module, then tdd, then code-review — one ticket per session",
        why: `${undone.length} of ${issues.length} tickets not done`,
      };
    return { n: 6, name: "Close", skill: "close-slice", why: "every ticket is done" };
  }
  if (has("design.md")) {
    if (open.length > 0 || fog.length > 0)
      return {
        n: 3,
        name: "Work the frontier",
        skill: "research and spikes are AFK and parallel; grilling is HITL and one per session",
        why: `${open.length} open question(s), ${fog.length} fog patch(es)`,
      };
    return {
      n: 4,
      name: "Plan",
      skill: "plan-slice",
      why: "Open and Fog are empty, spec.md does not exist",
    };
  }
  if (has("scope.md"))
    return {
      n: 2,
      name: "Design",
      skill: "design-slice",
      why: "scope.md exists, design.md does not",
    };
  return { n: 1, name: "Map", skill: "map-slice", why: "no scope.md" };
})();

const mark = (n: number): string => (n < step.n ? "done" : n === step.n ? "HERE" : "—");
const pad = (s: string, n: number): string => s.padEnd(n);

console.log(`${slug.toUpperCase()} — step ${step.n} of 6 · ${step.name}`);
console.log(`  because: ${step.why}`);
console.log(`  run:     ${step.skill}\n`);
for (const [n, name] of [
  [1, "Map"],
  [2, "Design"],
  [3, "Work the frontier"],
  [4, "Plan"],
  [5, "Build"],
  [6, "Close"],
] as const) {
  console.log(`  ${n} ${pad(name, 20)} ${mark(n)}`);
}

console.log(`\n  scope.md   ${has("scope.md") ? "yes" : "no"}`);
console.log(`  design.md  ${has("design.md") ? "yes" : "no"}`);
console.log(`  spec.md    ${has("spec.md") ? "yes" : "no"}`);
if (issues.length > 0) {
  console.log(`  tickets    ${issues.length - undone.length}/${issues.length} done`);
  for (const t of issues) console.log(`    ${pad(t.file, 40)} ${t.status}`);
}
if (open.length > 0) {
  console.log(`\n  open questions`);
  for (const l of open) console.log(`    ${l.trim().slice(0, 96)}`);
}
if (fog.length > 0) console.log(`\n  fog patches ${fog.length}`);

const page = `${DIR}/${slug}.html`;
const newest = ["scope.md", "design.md", "spec.md"]
  .filter(has)
  .map((f) => fs.statSync(`${DIR}/${f}`).mtimeMs)
  .reduce((a, b) => Math.max(a, b), 0);
if (!fs.existsSync(page)) console.log(`\n  page       MISSING — run render-slice`);
else if (fs.statSync(page).mtimeMs < newest)
  console.log(`\n  page       STALE — a source file is newer. Run render-slice`);
else console.log(`\n  page       current`);
