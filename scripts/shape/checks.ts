/**
 * The five repo-shape checks, as functions of their inputs.
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
        if (target.pathname !== doc.pathname && !exists(target.pathname.slice(1))) {
          found.push({ at: `${rel}:${i + 1}`, said: `links to \`${link}\`, which does not exist` });
        }
      }
    });
  return found;
};
