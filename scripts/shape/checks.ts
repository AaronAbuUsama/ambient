/**
 * The six repo-shape checks, as functions of their inputs.
 *
 * Each takes what it needs — a file list, a reader, or the text itself — and
 * returns the offences it found. None of them reads a disk, prints, or exits:
 * that is [`shape.ts`](../shape.ts), which walks the tree once and composes
 * these. `scripts/` sits outside `src/modules/`, so the six slots of
 * [modules.md](../../docs/rules/modules.md) do not apply here and nothing checks
 * for them — but the seam they exist for does: the work is a value returned from
 * a pure function, and the process is at the edge.
 *
 * They are here because they were unreachable. A script whose checks run as
 * module-level side effects cannot be imported without walking the repository
 * and calling `process.exit`, so nothing could ask one of them a question. On
 * 2026-08-20 the roadmap cap counted the empty string after the terminating
 * newline, was one over on every Prettier-formatted file, and would have
 * rejected a conforming roadmap at exactly its cap. Review caught it; nothing
 * else could have. [checks.test.ts](./checks.test.ts) is what can now.
 */

/** Where the problem is, and what is wrong with it — one printed line. */
export type Offence = { readonly at: string; readonly said: string };

/**
 * `contract/file-length` is told about one file at a time, so it can honour a row
 * but never notice that the file it names is gone. A row nobody can reach is an
 * excuse standing over nothing, which is how an exception list decays into a
 * blanket. Only a walk of the tree can say so.
 */
export const staleExceptions = (
  declared: readonly string[],
  sources: readonly string[],
): readonly Offence[] =>
  declared
    .filter((rel) => !sources.includes(rel))
    .map((rel) => ({ at: rel, said: "declared as a length exception, but no such source file" }));

/** The five named slots. The directory itself is the sixth. */
const SLOTS = ["README.md", "types.ts", "service.ts", "internal"];

/** Every module has all six slots — [modules.md](../../docs/rules/modules.md). */
export const missingSlots = (
  modules: readonly string[],
  exists: (rel: string) => boolean,
): readonly Offence[] => {
  const found: Offence[] = [];
  for (const name of modules) {
    for (const slot of [...SLOTS, `${name}.test.ts`]) {
      const at = `src/modules/${name}/${slot}`;
      if (!exists(at)) found.push({ at, said: "missing — every module has all six slots" });
    }
  }
  return found;
};

/** A module's row in a map — `| \`name\` |` at the head of a table line. */
const ROW = /^\|\s*`([a-z-]+)`\s*\|/;

/**
 * The row in `seams.md` is what makes a directory a module — `new-module`
 * refuses to scaffold one without it. Nothing enforced that: for the whole of
 * INGEST's steps 1-4, `ingest` was a module in `design.md`, in the call graph
 * and in five tickets, owned no row, and this check printed `clean` on every
 * one of those days. Ticket `00` in both IMPORT and INGEST existed only to
 * write those rows by hand — it is this missing check with a number on it.
 *
 * A module is claimed by its directory under `src/modules/`, or by a row in a
 * slice design's § Seam delta. `designs` maps each of those documents to its text.
 */
export const missingSeamRows = (
  modules: readonly string[],
  seams: string,
  designs: ReadonlyMap<string, string>,
): readonly Offence[] => {
  const declared = new Set([...seams.matchAll(new RegExp(ROW, "gm"))].map(([, n]) => n));

  /** Module → the place that claims it is one, for the offence to point at. */
  const claimed = new Map<string, string>(modules.map((name) => [name, `src/modules/${name}`]));

  for (const [rel, text] of designs) {
    let inDelta = false;
    for (const line of text.split("\n")) {
      if (line.startsWith("## ")) inDelta = line.startsWith("## Seam delta");
      if (!inDelta) continue;
      const named = ROW.exec(line)?.[1];
      if (named !== undefined && !claimed.has(named)) claimed.set(named, rel);
    }
  }

  return [...claimed]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .filter(([name]) => !declared.has(name))
    .map(([name, where]) => ({
      at: where,
      said: `\`${name}\` owns no row in docs/design/seams.md — the row is what makes it a module`,
    }));
};

/**
 * The roadmap stays inside the cap it declares. The number is read off the file's
 * own first lines, so it has one home and it is the roadmap's.
 */
export const overCap = (rel: string, text: string): readonly Offence[] => {
  const cap = /\*\*Hard cap: (\d+) lines\.\*\*/.exec(text);
  if (cap === null) {
    return [
      {
        at: rel,
        said: "declares no `**Hard cap: N lines.**` — the cap is the line this check reads",
      },
    ];
  }
  const limit = Number(cap[1]);
  /** The terminating newline is not a line. Drop it and this agrees with `wc -l`. */
  const length = text.replace(/\n$/, "").split("\n").length;
  return length > limit
    ? [
        {
          at: `${rel}:${length}`,
          said: `${length} lines against its own cap of ${limit} — move the oldest ledger entries to docs/history/ledger.md`,
        },
      ]
    : [];
};

/** Fenced blocks and inline code are illustration, not links to follow. */
const prose = (text: string): string =>
  text
    .replaceAll(/^```[\s\S]*?^```/gm, (b) => b.replaceAll(/[^\n]/g, " "))
    .replaceAll(/`[^`\n]*`/g, "");

/**
 * The literal filename behind a resolved URL path. `URL` percent-encodes what it
 * resolves and a filesystem does not, so `héllo.md` arrives as `h%C3%A9llo.md`
 * and would be looked up under that name and reported broken. Decoding is per run
 * of escapes, so a lone `%` — a character in a filename, not an escape — survives;
 * and a run that decodes to nothing valid is left exactly as written, because a
 * name this cannot read is a link to report, never a crash of the whole run.
 */
const literal = (pathname: string): string =>
  pathname.replaceAll(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return run;
    }
  });

/**
 * Every cross-link in a document resolves. `exists` is asked about a path from
 * the repository root, which is what a link resolves to once the document's own
 * directory is applied — so the offence names a file someone can open.
 */
export const brokenLinks = (
  rel: string,
  text: string,
  exists: (path: string) => boolean,
): readonly Offence[] => {
  const found: Offence[] = [];
  const doc = new URL(rel, "file:///");
  prose(text)
    .split("\n")
    .forEach((line, i) => {
      for (const [, link] of line.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (link === undefined || /^(https?:|mailto:|#)/.test(link)) continue;
        // `#frag` and a trailing `:NN` line anchor are both anchors INTO a file,
        // not part of its path. `file.md:38` is the citation form this repo asks
        // for everywhere — the checker rejecting it made the documented style
        // illegal, which is the checker being wrong rather than the document.
        const path = (link.split("#")[0] ?? "").replace(/:\d+(-\d+)?$/, "");
        const target = new URL(path, doc);
        if (target.pathname !== doc.pathname && !exists(literal(target.pathname).slice(1))) {
          found.push({ at: `${rel}:${i + 1}`, said: `links to \`${link}\`, which does not exist` });
        }
      }
    });
  return found;
};

/** Every run of digits in a table cell. A canvas states a four-number viewBox; the rest, one. */
const digits = (cell: string): readonly number[] => [...cell.matchAll(/\d+/g)].map(Number);

/**
 * The four diagram recipes obey the geometry they declare —
 * [artefacts.md](../../docs/rules/artefacts.md).
 *
 * `diagrams.md` is solved geometry, and the first item of its own checklist is the
 * pair of rules that bind: the legend rule fixes the canvas, and the lowest ink
 * clears the legend by the floor. Nothing ran that checklist, so the file shipped
 * with a canvas formula true of no recipe and a legend rule 8px off its own canvas —
 * a check nobody runs hides the rules that are broken as readily as the layouts.
 *
 * Both constants are read out of that checklist item rather than copied here, because
 * a second copy of a number is how the first two went wrong. The match is anchored to
 * the item's own line, because a second copy already exists: recipe B's history quotes
 * `legendRuleY == canvasHeight - 68` verbatim 120 lines above the checklist, and an
 * unanchored search takes that one — frozen prose outvoting the rule it is the history of.
 *
 * `lowestInk` is the one figure a parser cannot find, being a judgement rather than a
 * coordinate — recipe B's is a lifeline foot and not its deepest message, recipe C's at
 * one kind is the gate and not the box — so each recipe declares it in a
 * `lowest ink | legend rule | canvas` row and this reads the row. The judgement stays in
 * the file; only the arithmetic is here.
 */
export const brokenGeometry = (rel: string, text: string): readonly Offence[] => {
  const stated =
    /^- \[ \] `legendRuleY == canvasHeight - (\d+)`, and `lowestInk \+ (\d+) <= legendRuleY`/m.exec(
      text,
    );
  if (stated === null) {
    return [
      {
        at: rel,
        said: "no `- [ ]` checklist item states legendRuleY == canvasHeight - N and lowestInk + N <= legendRuleY, backticked, on one line — that item is where this check reads both constants",
      },
    ];
  }
  const strip = Number(stated[1]);
  const floor = Number(stated[2]);
  const found: Offence[] = [];

  /**
   * Recipe letter → geometry rows declared. One that declares none is itself an offence,
   * so the four are seeded rather than learned from the headings found: a heading deleted
   * or renamed would otherwise take its recipe out of the check entirely, and stripping
   * all four made this walk report clean. The roster is a structural fact that changes
   * about never, and when it does a loud failure here is the point — the same bargain as
   * `LONGER` in [`lint/legibility.ts`](../lint/legibility.ts). A fifth letter is still
   * tracked below, so the seed is a floor and not a ceiling.
   */
  const declared = new Map<string, number>([
    ["A", 0],
    ["B", 0],
    ["C", 0],
    ["D", 0],
  ]);
  let recipe = "";
  let columns: { readonly ink: number; readonly rule: number; readonly canvas: number } | null =
    null;

  for (const [i, line] of text.split("\n").entries()) {
    // Cleared by any `##`, not only a recipe's: left standing, a renamed heading hands the
    // next recipe's rows to the one above it and reports D's broken canvas as C's.
    if (line.startsWith("## ")) recipe = /^## Recipe ([A-Z])\b/.exec(line)?.[1] ?? "";
    if (!line.startsWith("|")) {
      columns = null;
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim().toLowerCase());
    const named = (header: string): number => cells.indexOf(header);
    const [ink, rule, canvas] = [named("lowest ink"), named("legend rule"), named("canvas")];
    if (ink !== -1 && rule !== -1 && canvas !== -1) {
      columns = { ink, rule, canvas };
      continue;
    }
    if (columns === null || /^:?-+:?$/.test(cells[0] ?? "")) continue;

    const at = `${rel}:${String(i + 1)}`;
    const lowest = digits(cells[columns.ink] ?? "")[0];
    const legend = digits(cells[columns.rule] ?? "")[0];
    const box = digits(cells[columns.canvas] ?? "");
    const height = box.length === 4 ? box[3] : undefined;
    if (lowest === undefined || legend === undefined || height === undefined) {
      found.push({
        at,
        said: `recipe ${recipe}: a geometry row missing its lowest ink, legend rule or viewBox`,
      });
      continue;
    }
    if (recipe === "") {
      found.push({
        at,
        said: "a geometry row under no `## Recipe` heading — it is declared for no recipe",
      });
      continue;
    }
    declared.set(recipe, (declared.get(recipe) ?? 0) + 1);
    if (legend !== height - strip) {
      found.push({
        at,
        said: `recipe ${recipe}: a canvas ${String(height)} tall under a legend rule at ${String(legend)} — the rule fixes the canvas, so \`canvasHeight\` is ${String(legend + strip)}`,
      });
    }
    if (lowest + floor > legend) {
      found.push({
        at,
        said: `recipe ${recipe}: lowest ink ${String(lowest)} clears the legend rule ${String(legend)} by ${String(legend - lowest)}, under the floor of ${String(floor)}`,
      });
    }
  }

  for (const [name, rows] of declared) {
    if (rows === 0) {
      found.push({
        at: rel,
        said: `recipe ${name} declares no \`lowest ink | legend rule | canvas\` row — a check that passes by looking at nothing is what let two wrong numbers sit in that file`,
      });
    }
  }
  return found;
};
