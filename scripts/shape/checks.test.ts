/**
 * The six checks `vp run shape` runs, asked the questions a repository never
 * happens to pose.
 *
 * The cap check is why this file exists. It counted `split("\n").length` on text
 * Prettier terminates with a newline, so it was one over on every file it ever
 * read and would have rejected a roadmap that sat exactly on its own cap — a
 * boundary no real roadmap had reached yet, and one review caught rather than a
 * check. Every boundary of it is a row here: under, exactly on, one over, with
 * and without the terminating newline, and a file that declares no cap at all.
 */

import { expect, it } from "vite-plus/test";

import type { Offence } from "./checks.ts";
import {
  brokenGeometry,
  brokenLinks,
  missingSeamRows,
  missingSlots,
  overCap,
  staleExceptions,
} from "./checks.ts";

/** Exactly `count` lines by `wc -l`, the first of which declares the cap. */
const roadmap = (count: number, cap: number, terminated = true): string =>
  Array.from({ length: count }, (_, i) =>
    i === 0 ? `**Hard cap: ${cap} lines.**` : `line ${i + 1}`,
  ).join("\n") + (terminated ? "\n" : "");

/** An `exists` for a repository that contains exactly these paths. */
const holding = (...paths: readonly string[]): ((rel: string) => boolean) => {
  const there = new Set(paths);
  return (rel) => there.has(rel);
};

// ── the roadmap cap ───────────────────────────────────────────────────

it("a roadmap under its cap, and one exactly on it, are both clean", () => {
  expect(overCap("r.md", roadmap(199, 200))).toEqual([]);

  // The row the shipped bug would have failed. A conforming 200-line roadmap
  // counted 201 and was rejected at exactly the number it is allowed to be.
  expect(overCap("r.md", roadmap(200, 200))).toEqual([]);
});

it("one line over the cap names the length, the cap, and where to move the ledger", () => {
  const [offence, ...rest] = overCap("docs/design/roadmap.md", roadmap(201, 200));

  expect(rest).toEqual([]);
  expect(offence?.at).toBe("docs/design/roadmap.md:201");
  expect(offence?.said).toBe(
    "201 lines against its own cap of 200 — move the oldest ledger entries to docs/history/ledger.md",
  );
});

it("the terminating newline is not a line, and a file without one counts the same", () => {
  // Prettier writes the newline, so this is every file the check ever reads.
  expect(overCap("r.md", roadmap(5, 5, true))).toEqual([]);
  expect(overCap("r.md", roadmap(5, 5, false))).toEqual([]);

  // And the count is the same number either way once the cap is crossed.
  expect(overCap("r.md", roadmap(6, 5, true))[0]?.at).toBe("r.md:6");
  expect(overCap("r.md", roadmap(6, 5, false))[0]?.at).toBe("r.md:6");
});

it("a roadmap that declares no cap is itself the offence", () => {
  const [offence, ...rest] = overCap("r.md", "# Roadmap\n\nno cap here.\n");

  expect(rest).toEqual([]);
  expect(offence?.at).toBe("r.md");
  expect(offence?.said).toBe(
    "declares no `**Hard cap: N lines.**` — the cap is the line this check reads",
  );
});

// ── the length exception list ─────────────────────────────────────────

it("a length exception naming a file that is gone is an excuse standing over nothing", () => {
  const sources = ["src/modules/home/home.test.ts", "src/main.ts"];

  expect(staleExceptions(["src/modules/home/home.test.ts"], sources)).toEqual([]);
  expect(staleExceptions(["src/modules/gone/gone.test.ts"], sources)).toEqual([
    {
      at: "src/modules/gone/gone.test.ts",
      said: "declared as a length exception, but no such source file",
    },
  ]);
});

// ── the six slots ─────────────────────────────────────────────────────

it("every missing slot is named, and the test slot is named after its module", () => {
  const whole = ["README.md", "types.ts", "service.ts", "internal", "home.test.ts"].map(
    (slot) => `src/modules/home/${slot}`,
  );

  expect(missingSlots(["home"], holding(...whole))).toEqual([]);
  expect(missingSlots(["home"], holding(...whole.slice(0, 3))).map((o) => o.at)).toEqual([
    "src/modules/home/internal",
    "src/modules/home/home.test.ts",
  ]);
});

// ── the seam map ──────────────────────────────────────────────────────

const SEAMS = `# Seams

| Module | Owns |
|---|---|
| \`home\` | the chat folder |
`;

const design = (body: string): ReadonlyMap<string, string> =>
  new Map([["docs/planning/ingest/design.md", body]]);

it("a module directory with no row in the seam map is not a module", () => {
  expect(missingSeamRows(["home"], SEAMS, new Map())).toEqual([]);
  expect(missingSeamRows(["home", "ingest"], SEAMS, new Map())).toEqual([
    {
      at: "src/modules/ingest",
      said: "`ingest` owns no row in docs/design/seams.md — the row is what makes it a module",
    },
  ]);
});

it("a module named in a design's seam delta is claimed by that design, before it has a directory", () => {
  const delta = design("## Seam delta\n\n| Module | Change |\n|---|---|\n| `ingest` | new |\n");

  expect(missingSeamRows([], SEAMS, delta).map((o) => o.at)).toEqual([
    "docs/planning/ingest/design.md",
  ]);

  // The same table under any other heading is a table, not a claim.
  const elsewhere = design("## Call graph\n\n| Module | Change |\n|---|---|\n| `ingest` | new |\n");
  expect(missingSeamRows([], SEAMS, elsewhere)).toEqual([]);
});

// ── cross-links ───────────────────────────────────────────────────────

it("a link resolves from the document's own directory, and a broken one names its line", () => {
  const doc = "# Legibility\n\nsee [the rule](../../scripts/lint/legibility.ts).\n";

  expect(
    brokenLinks("docs/rules/legibility.md", doc, holding("scripts/lint/legibility.ts")),
  ).toEqual([]);
  expect(brokenLinks("docs/rules/legibility.md", doc, holding())).toEqual([
    {
      at: "docs/rules/legibility.md:3",
      said: "links to `../../scripts/lint/legibility.ts`, which does not exist",
    },
  ]);
});

it("an anchor and a `:NN` citation are anchors into a file, not part of its path", () => {
  const doc = "[a](./seams.md#the-map) and [b](./seams.md:38) and [c](./seams.md:38-40)\n";

  expect(brokenLinks("docs/design/roadmap.md", doc, holding("docs/design/seams.md"))).toEqual([]);
});

it("a URL, a mailto, a bare fragment and a self-link are not files to find", () => {
  const doc = "[a](https://x.dev) [b](mailto:a@b.c) [c](#here) [d](roadmap.md)\n";

  expect(brokenLinks("docs/design/roadmap.md", doc, holding())).toEqual([]);
});

it("an encoded or non-ASCII name is looked up by the name on disk, not the escape", () => {
  // `URL` percent-encodes what it resolves; a filesystem does not. Passing the
  // encoded form across the seam reported every such link as broken.
  const doc = "[a](./a%20b.md) and [b](./héllo.md) and [c](./h%C3%A9llo.md)\n";

  expect(brokenLinks("docs/design/roadmap.md", doc, holding("docs/design/a b.md"))).toEqual([
    { at: "docs/design/roadmap.md:1", said: "links to `./héllo.md`, which does not exist" },
    { at: "docs/design/roadmap.md:1", said: "links to `./h%C3%A9llo.md`, which does not exist" },
  ]);

  expect(
    brokenLinks(
      "docs/design/roadmap.md",
      doc,
      holding("docs/design/a b.md", "docs/design/héllo.md"),
    ),
  ).toEqual([]);
});

it("a name this cannot decode is a link to report, never a crash of the whole run", () => {
  // `decodeURIComponent` throws on both of these — a lone `%` is not an escape,
  // and `%C3` is half a character. Decoding the whole path at once would take
  // `vp run shape` down with a URIError instead of printing an offence.
  const doc = "[a](./50%off.md) and [b](./%C3.md)\n";

  expect(brokenLinks("docs/design/roadmap.md", doc, holding("docs/design/50%off.md"))).toEqual([
    { at: "docs/design/roadmap.md:1", said: "links to `./%C3.md`, which does not exist" },
  ]);
});

it("a link inside a fence or inline code is illustration, and the lines still count", () => {
  const doc = ["```md", "[a](./gone.md)", "```", "`[b](./gone.md)`", "[c](./gone.md)"].join("\n");

  expect(brokenLinks("docs/design/roadmap.md", doc, holding())).toEqual([
    { at: "docs/design/roadmap.md:5", said: "links to `./gone.md`, which does not exist" },
  ]);
});

// ── the diagram recipes ───────────────────────────────────────────────

/** One recipe: its letter, and the `ink | rule | canvas height` rows it declares. */
type Declared = readonly [string, readonly (readonly [number, number, number])[]];

/** The checklist item both constants are read out of, exactly as `diagrams.md` writes it. */
const CHECKLIST =
  "- [ ] `legendRuleY == canvasHeight - 68`, and `lowestInk + 32 <= legendRuleY` — **ink, not";

/** A minimal `diagrams.md` — a preamble, the recipes with their rows, the checklist at the foot. */
const diagrams = (recipes: readonly Declared[], preamble = ""): string =>
  [
    "# The four diagram recipes",
    preamble,
    ...recipes.flatMap(([letter, rows]) => [
      `## Recipe ${letter} — a recipe`,
      "| lowest ink | legend rule | canvas |",
      "|---|---|---|",
      ...rows.map(
        ([ink, rule, height]) =>
          `| ${String(ink)} | ${String(rule)} | \`0 0 1000 ${String(height)}\` |`,
      ),
      "",
    ]),
    "## Before you emit any diagram",
    CHECKLIST,
  ].join("\n");

/** The seven rows the four recipes declare today, verbatim. */
const SOLVED: readonly Declared[] = [
  ["A", [[376, 412, 480]]],
  ["B", [[612, 644, 712]]],
  [
    "C",
    [
      [136, 172, 240],
      [192, 228, 296],
      [288, 324, 392],
      [384, 420, 488],
    ],
  ],
  ["D", [[296, 332, 400]]],
];

it("the seven rows the four recipes declare today are clean", () => {
  expect(brokenGeometry("d.md", diagrams(SOLVED))).toEqual([]);
});

it("a canvas that is not the legend rule plus the strip names the canvas the rule implies", () => {
  // Recipe B shipped at 720 against its own rule at 644. `diagrams.md` argues that moving
  // the rule down to 652 is the wrong half — it deepens the emptiest bottom on the page —
  // so the offence states the canvas, not the rule.
  const [offence, ...rest] = brokenGeometry(
    "d.md",
    diagrams([...SOLVED.slice(0, 1), ["B", [[612, 644, 720]]], ...SOLVED.slice(2)]),
  );

  expect(rest).toEqual([]);
  expect(offence?.said).toBe(
    "recipe B: a canvas 720 tall under a legend rule at 644 — the rule fixes the canvas, so `canvasHeight` is 712",
  );
});

it("the clearance floor is exact — 32 clears, 31 does not", () => {
  const at = (ink: number): readonly Offence[] =>
    brokenGeometry("d.md", diagrams([["A", [[ink, 412, 480]]], ...SOLVED.slice(1)]));

  expect(at(380)).toEqual([]);
  expect(at(381)[0]?.said).toBe(
    "recipe A: lowest ink 381 clears the legend rule 412 by 31, under the floor of 32",
  );
});

it("the constants come from the checklist item, not from prose that quotes it", () => {
  // Recipe B's history quotes `legendRuleY == canvasHeight - 68` verbatim 120 lines above
  // the checklist, and `decisions.md` means that paragraph is never rewritten. An
  // unanchored search took the prose, so frozen history outvoted the rule it is about.
  const history = "720 reserved a 76px strip, so `legendRuleY == canvasHeight - 999` failed by 8.";

  expect(brokenGeometry("d.md", diagrams(SOLVED, history))).toEqual([]);
});

it("a recipe that declares no row is itself an offence", () => {
  const [offence, ...rest] = brokenGeometry("d.md", diagrams([...SOLVED.slice(0, 3), ["D", []]]));

  expect(rest).toEqual([]);
  expect(offence?.at).toBe("d.md");
  expect(offence?.said).toBe(
    "recipe D declares no `lowest ink | legend rule | canvas` row — a check that passes by looking at nothing is what let two wrong numbers sit in that file",
  );
});

it("a renamed heading orphans its rows rather than handing them to the recipe above", () => {
  // Left standing, `recipe` still held "C" and reported D's canvas as recipe C's — a
  // correct offence pointing a reader at the wrong recipe. Stripping all four headings
  // made the whole check report clean.
  const said = brokenGeometry(
    "d.md",
    diagrams(SOLVED).replace("## Recipe D — a recipe", "## Ticket DAG"),
  ).map((o) => o.said);

  expect(said).toEqual([
    "a geometry row under no `## Recipe` heading — it is declared for no recipe",
    "recipe D declares no `lowest ink | legend rule | canvas` row — a check that passes by looking at nothing is what let two wrong numbers sit in that file",
  ]);
});

it("a canvas cell that is not a four-number viewBox is an offence", () => {
  const [offence] = brokenGeometry(
    "d.md",
    diagrams(SOLVED).replace("`0 0 1000 400`", "`1000 400`"),
  );

  expect(offence?.said).toBe(
    "recipe D: a geometry row missing its lowest ink, legend rule or viewBox",
  );
});

it("no checklist item to read the constants from is the offence, and nothing else runs", () => {
  const [offence, ...rest] = brokenGeometry(
    "d.md",
    diagrams(SOLVED).replace(CHECKLIST, "- [ ] ink"),
  );

  expect(rest).toEqual([]);
  expect(offence?.said).toBe(
    "no `- [ ]` checklist item states legendRuleY == canvasHeight - N and lowestInk + N <= legendRuleY, backticked, on one line — that item is where this check reads both constants",
  );
});
