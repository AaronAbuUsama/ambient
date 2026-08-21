/**
 * `knowledge` through its interface — a `Place` in, Documents and Violations out.
 *
 * **The ontology is never a fixture.** Every test below converges a real home and
 * reads `global.schema` back through `home`'s own interface, so what `lint` is
 * checked against is the ontology this repository actually ships. Gate row 8's
 * `enum(history|witnessed)` is `schema.yaml`'s text, not this file's.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { openHome } from "~/modules/home/service.ts";
import type { Schema } from "~/modules/home/types.ts";
import { describe as describeViolation, lint, open } from "./service.ts";
import type { Base, Document } from "./types.ts";

const made: string[] = [];

type Opened = { readonly root: string; readonly schema: Schema; readonly base: Base };

const opened = async (): Promise<Opened> => {
  const root = `${fs.mkdtempSync(`${os.tmpdir()}/ambient-knowledge-`)}/home`;
  made.push(root);
  const home = openHome(root);
  if ("problems" in home) throw new Error("openHome refused the temp directory");
  expect(await home.converge()).toStrictEqual([]);
  const global = home.read();
  if ("problems" in global) throw new Error("home.read refused a converged home");
  return { root, schema: global.schema, base: open(home.knowledge) };
};

/** Written with `fs` alone — never through our own writer, which does not exist yet. */
const wrote = (root: string, at: string, text: string): void => {
  const path = `${root}/knowledge/${at}`;
  fs.mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  fs.writeFileSync(path, text);
};

const ZEESHAN = `---
type: Person
name: Zeeshan
aliases:
  - Zee
numbers: []
status: unreviewed
source: history
---

# Zeeshan
`;

afterEach(() => {
  for (const root of made.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

/** A `Person` as `observe` will write one, minus whatever the test takes away. */
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

const without = (document: Document, key: string): Document => {
  const frontmatter = { ...document.frontmatter };
  delete frontmatter[key];
  return { ...document, frontmatter };
};

it("names the file, the key and the expected form of a missing required field", async () => {
  const { schema } = await opened();
  expect(lint(schema, [without(zeeshan(), "source")]).map(describeViolation)).toStrictEqual([
    'person/zeeshan.md: missing key "source" — expected enum(history|witnessed)',
  ]);
  expect(lint(schema, [zeeshan()])).toStrictEqual([]);
});

it("names the offending key, which OpenKnowledge's own lint does not", async () => {
  const { schema } = await opened();
  const tagged: Document = {
    ...zeeshan(),
    frontmatter: { ...zeeshan().frontmatter, tags: ["engineering"] },
  };
  expect(lint(schema, [tagged]).map(describeViolation)).toStrictEqual([
    'person/zeeshan.md: unknown key "tags" ' +
      "(known: type, name, aliases, numbers, org, role, status, source)",
  ]);
});

it("reports every problem in a document, and an unrecognised type instead of its fields", async () => {
  const { schema } = await opened();
  const wrong: Document = {
    ...zeeshan(),
    frontmatter: { ...zeeshan().frontmatter, aliases: "Zee", status: "reviwed" },
  };
  expect(lint(schema, [wrong]).map(describeViolation)).toStrictEqual([
    'person/zeeshan.md: aliases must be text[], got "Zee"',
    'person/zeeshan.md: status must be enum(unreviewed|reviewed), got "reviwed"',
  ]);

  const alien: Document = { ...zeeshan(), type: "Meeting" };
  expect(lint(schema, [alien]).map(describeViolation)).toStrictEqual([
    'person/zeeshan.md: unknown type "Meeting" ' +
      "(known: Person, Organization, Commitment, Issue, Media, Chat)",
  ]);
});

it("reads every document under the base, and never OpenKnowledge's own scaffold", async () => {
  const { root, schema, base } = await opened();
  wrote(root, "person/zeeshan.md", ZEESHAN);
  wrote(
    root,
    "organization/capxul.md",
    "---\ntype: Organization\nname: Capxul\naliases: []\nstatus: unreviewed\nsource: history\n---\n\n# Capxul\n",
  );

  const found = await base.all();
  if ("problems" in found) throw new Error(found.problems.map(describeViolation).join("\n"));
  expect(found.map((document) => document.at)).toStrictEqual([
    "organization/capxul.md",
    "person/zeeshan.md",
  ]);
  expect(found[1]).toStrictEqual(zeeshan());
  expect(lint(schema, found)).toStrictEqual([]);
});

it("collects every problem in the base rather than stopping at the first", async () => {
  const { root, base } = await opened();
  wrote(root, "person/torn.md", "no fence here\n");
  wrote(root, "person/unclosed.md", "---\naliases: [Zee\n---\n\n# x\n");
  wrote(root, "person/nameless.md", "---\ntype: Person\n---\n\n# x\n");
  wrote(root, "person/nested.md", "---\ntype: Person\nname: X\norg:\n  id: 1\n---\n\n# x\n");

  const found = await base.all();
  if (!("problems" in found)) throw new Error("all() accepted a base it cannot read");
  expect(found.problems.map(describeViolation)).toStrictEqual([
    'person/nameless.md: missing key "name" — expected text',
    'person/nested.md: org must be text or a list of text, got "a mapping"',
    "person/torn.md: no frontmatter block",
    "person/unclosed.md:2: malformed YAML — Flow sequence in block collection must be sufficiently indented and end with a ]",
  ]);
});

it("says so as a value when the base is not there, and never throws", async () => {
  const { root, base } = await opened();
  fs.rmSync(`${root}/knowledge`, { recursive: true });

  const found = await base.all();
  if (!("problems" in found)) throw new Error("all() invented an empty base");
  expect(found.problems).toStrictEqual([
    { at: ".", detail: { _tag: "Unreadable", cause: expect.stringContaining("ENOENT") } },
  ]);
});

/**
 * The `Place` is the grant, and a symlink is how a path inside it addresses bytes
 * outside it. Before this was refused, `all()` returned the target's frontmatter and
 * its body — the file below is written outside the home on purpose.
 */
it("refuses a document that is a link out of the base, and does not read it", async () => {
  const { root, base } = await opened();
  const outside = `${root}/../outside-secret.md`;
  fs.writeFileSync(
    outside,
    `---\ntype: Person\nname: Leaked\naliases: []\nnumbers: []\nstatus: unreviewed\nsource: history\n---\n\n# SECRET BODY\n`,
  );
  fs.mkdirSync(`${root}/knowledge/person`, { recursive: true });
  fs.symlinkSync(outside, `${root}/knowledge/person/link.md`);

  const all = await base.all();
  expect("problems" in all).toBe(true);
  if (!("problems" in all)) return;
  expect(all.problems.map(describeViolation)).toStrictEqual([
    "person/link.md: a link, not a file — the knowledge base is not read through symlinks",
  ]);
  expect(JSON.stringify(all)).not.toContain("SECRET BODY");
  expect(JSON.stringify(all)).not.toContain("Leaked");
});

/**
 * An empty fence is not a document: it carries neither `type` nor `name`. Both spellings
 * are here on purpose — `---\n---` never matches FENCE, while `---\n\n---` matches it with
 * an empty capture and reaches the decoder. Testing only the first said the class was
 * handled when the second returned `BadValue` on the empty key.
 */
it("reports an empty frontmatter block as having none, fenced blank or not", async () => {
  const { root, base } = await opened();
  wrote(root, "person/empty.md", "---\n---\n\n# Empty\n");
  wrote(root, "person/blank.md", "---\n\n---\n\n# Blank\n");

  const all = await base.all();
  expect("problems" in all).toBe(true);
  if (!("problems" in all)) return;
  expect(all.problems.map(describeViolation)).toStrictEqual([
    "person/blank.md: no frontmatter block",
    "person/empty.md: no frontmatter block",
  ]);
});
