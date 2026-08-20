/**
 * The five checks `vp run shape` runs, asked the questions a repository never
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

import { brokenLinks, missingSeamRows, missingSlots, overCap, staleExceptions } from "./checks.ts";

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

it("a link inside a fence or inline code is illustration, and the lines still count", () => {
  const doc = ["```md", "[a](./gone.md)", "```", "`[b](./gone.md)`", "[c](./gone.md)"].join("\n");

  expect(brokenLinks("docs/design/roadmap.md", doc, holding())).toEqual([
    { at: "docs/design/roadmap.md:5", said: "links to `./gone.md`, which does not exist" },
  ]);
});
