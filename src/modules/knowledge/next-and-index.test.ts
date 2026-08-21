/**
 * `next` and `index` — the work queue and the derived read model. Gate rows 10
 * and 11 of [`spec.md`](../../../docs/planning/knowledge/spec.md).
 *
 * **`next` and `index` are pure.** Testing Decisions: "direct call... no
 * fixtures, no temp directory" — every `Document` below is a literal, never
 * read off disk. `writeIndex` is the one effect here, and row 11 is checked on
 * raw bytes, never a parsed object: a byte-for-byte match is the only thing
 * that proves the encoding is deterministic, not merely the value.
 *
 * A separate file from [`knowledge.test.ts`](./knowledge.test.ts), which already
 * sits at its own length, rather than one gate split across two files nobody
 * knows to open — [`legibility.md`](../../../docs/rules/legibility.md).
 */

import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { openHome } from "~/modules/home/service.ts";
import type { Home } from "~/modules/home/types.ts";
import { index, next, open, writeIndex } from "./service.ts";
import type { Base, Document } from "./types.ts";

const made: string[] = [];

type Opened = { readonly root: string; readonly home: Home; readonly base: Base };

const opened = async (): Promise<Opened> => {
  const root = `${fs.mkdtempSync(`${os.tmpdir()}/ambient-knowledge-`)}/home`;
  made.push(root);
  const home = openHome(root);
  if ("problems" in home) throw new Error("openHome refused the temp directory");
  expect(await home.converge()).toStrictEqual([]);
  return { root, home, base: open(home.knowledge) };
};

/** Written with `fs` alone — `observe`'s own writer is ticket 04's, not this one's. */
const wrote = (root: string, at: string, text: string): void => {
  const path = `${root}/knowledge/${at}`;
  fs.mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  fs.writeFileSync(path, text);
};

afterEach(() => {
  for (const root of made.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const zeeshan = (): Document => ({
  at: "person/zeeshan.md",
  type: "Person",
  name: "Zeeshan",
  frontmatter: {
    type: "Person",
    name: "Zeeshan",
    aliases: ["Zee"],
    numbers: [],
    status: "unreviewed",
    source: "history",
  },
  body: "\n# Zeeshan\n",
});

/** A second `Person`, reviewed — the work queue must not queue it. */
const reviewed = (): Document => ({
  ...zeeshan(),
  at: "person/reviewed.md",
  name: "Reviewed",
  frontmatter: { ...zeeshan().frontmatter, name: "Reviewed", status: "reviewed" },
});

/** An `Organization` — a second type, so `next`'s `type` filter has something to narrow. */
const capxul = (): Document => ({
  at: "organization/capxul.md",
  type: "Organization",
  name: "Capxul",
  frontmatter: {
    type: "Organization",
    name: "Capxul",
    aliases: [],
    status: "unreviewed",
    source: "history",
  },
  body: "\n# Capxul\n",
});

/** A `Commitment` — its `status` enum has no `unreviewed` arm, so it never queues by accident. */
const commitment = (): Document => ({
  at: "commitment/ship.md",
  type: "Commitment",
  name: "ship",
  frontmatter: {
    type: "Commitment",
    name: "ship",
    what: "Ship it",
    who: "person/zeeshan",
    source_window: "capxul-devs@1..2",
    status: "open",
  },
  body: "\n# ship\n",
});

// ── gate row 10 — `next`, the work queue ─────────────────────────────

it("filters the work queue to a frontmatter status and nothing more", () => {
  const docs = [capxul(), commitment(), reviewed(), zeeshan()];
  expect(next(docs, {}).map((document) => document.at)).toStrictEqual([capxul().at, zeeshan().at]);
});

it("returns the document values themselves, not a projection of them", () => {
  expect(next([zeeshan(), reviewed()], {})).toStrictEqual([zeeshan()]);
});

it("narrows by type case-insensitively, so --type=person reaches Person", () => {
  const docs = [capxul(), zeeshan()];
  expect(next(docs, { type: "person" }).map((document) => document.at)).toStrictEqual([
    zeeshan().at,
  ]);
  expect(next(docs, { type: "Person" }).map((document) => document.at)).toStrictEqual([
    zeeshan().at,
  ]);
  expect(next(docs, { type: "organization" }).map((document) => document.at)).toStrictEqual([
    capxul().at,
  ]);
});

it("caps the queue at limit, preserving order, and leaves it unbounded without one", () => {
  const third: Document = {
    ...zeeshan(),
    at: "person/third.md",
    name: "Third",
    frontmatter: { ...zeeshan().frontmatter, name: "Third" },
  };
  const docs = [zeeshan(), capxul(), third];
  expect(next(docs, { limit: 2 }).map((document) => document.at)).toStrictEqual([
    zeeshan().at,
    capxul().at,
  ]);
  expect(next(docs, {}).map((document) => document.at)).toStrictEqual([
    zeeshan().at,
    capxul().at,
    third.at,
  ]);
});

// ── gate row 11 — `index`, the derived read model ────────────────────

it("builds one row and one count per document, pure", () => {
  const docs = [zeeshan(), capxul(), commitment()];
  expect(index(docs)).toStrictEqual({
    documents: [
      { at: zeeshan().at, type: "Person", name: "Zeeshan" },
      { at: capxul().at, type: "Organization", name: "Capxul" },
      { at: commitment().at, type: "Commitment", name: "ship" },
    ],
    counts: { Person: 1, Organization: 1, Commitment: 1 },
  });
});

it("counts more than one document of the same type", () => {
  const second: Document = {
    ...zeeshan(),
    at: "person/second.md",
    name: "Second",
    frontmatter: { ...zeeshan().frontmatter, name: "Second" },
  };
  expect(index([zeeshan(), second]).counts).toStrictEqual({ Person: 2 });
});

it("writes the derived index to home.index, outside the base", async () => {
  const { root, home, base } = await opened();
  wrote(
    root,
    "person/zeeshan.md",
    "---\ntype: Person\nname: Zeeshan\nstatus: unreviewed\nsource: history\n---\n",
  );

  const docs = await base.all();
  if ("problems" in docs) throw new Error("base.all refused a clean base");
  const written = await writeIndex(home.index, index(docs));
  if ("problems" in written) throw new Error("writeIndex refused a writable temp directory");
  expect(written).toStrictEqual({ bytes: expect.any(Number) });
  expect(fs.existsSync(home.index.path)).toBe(true);
  expect(home.index.path).toBe(`${root}/index.json`);
  expect(home.index.path.startsWith(`${root}/knowledge/`)).toBe(false);
});

/**
 * Row 11 is the one with teeth: an index that is not reproducible is not
 * actually derived. Bytes, not a parsed object.
 */
it("row 11 — deleting the index and re-running from the same base reproduces it byte-identically", async () => {
  const { root, home, base } = await opened();
  wrote(
    root,
    "person/zeeshan.md",
    "---\ntype: Person\nname: Zeeshan\nstatus: unreviewed\nsource: history\n---\n",
  );
  wrote(
    root,
    "organization/capxul.md",
    "---\ntype: Organization\nname: Capxul\naliases: []\nstatus: unreviewed\nsource: history\n---\n\n# Capxul\n",
  );

  const rebuilt = async (): Promise<Buffer> => {
    const docs = await base.all();
    if ("problems" in docs) throw new Error("base.all refused a base row 11 needs clean");
    const written = await writeIndex(home.index, index(docs));
    if ("problems" in written) throw new Error("writeIndex refused a writable temp directory");
    return fs.readFileSync(home.index.path);
  };

  const first = await rebuilt();
  fs.rmSync(home.index.path);
  expect(fs.existsSync(home.index.path)).toBe(false);
  const second = await rebuilt();

  expect(second.equals(first)).toBe(true);
});

/**
 * A type name is an open vocabulary — `schema.yaml` invites users to add types — so the
 * counter cannot be a plain object. Before the `Map`, `constructor` counted to
 * `"function Object() { [native code] }11"` and `__proto__` was absent from the JSON
 * altogether, which makes an index that claims to be derived quietly untrue.
 */
it("counts type names that collide with Object.prototype", () => {
  const docs = ["constructor", "constructor", "__proto__", "Person"].map((type, n) => ({
    at: `${type}/${String(n)}.md`,
    type,
    name: `n${String(n)}`,
    frontmatter: { type, name: `n${String(n)}` },
    body: "",
  }));

  const built = index(docs);

  // The expectation is built with `fromEntries` for the same reason the counter is:
  // `{ __proto__: 1 }` in a literal sets the prototype and creates no key at all, so
  // the obvious spelling of this assertion carries the very bug it is here to catch.
  expect(built.counts).toStrictEqual(
    Object.fromEntries([
      ["constructor", 2],
      ["__proto__", 1],
      ["Person", 1],
    ]),
  );
  expect(Object.keys(built.counts).sort()).toStrictEqual(["Person", "__proto__", "constructor"]);
});
