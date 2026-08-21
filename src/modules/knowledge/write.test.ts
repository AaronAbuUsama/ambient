/**
 * `base.write` through its interface — an Observation in, bytes on disk or a
 * `Refusal` value out. Gate rows 16, 17 and 18 of
 * [`docs/planning/knowledge/spec.md`](../../../docs/planning/knowledge/spec.md).
 *
 * Split from [`knowledge.test.ts`](./knowledge.test.ts) rather than appended to
 * it — that file is already near the 250-line cap, and `channel` already splits
 * this way (`channel.test.ts` plus `lines.test.ts`) rather than claiming a
 * legibility exception for one more gate.
 */

import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { openHome } from "~/modules/home/service.ts";
import type { Schema } from "~/modules/home/types.ts";
import { describe as describeViolation, open } from "./service.ts";
import type { Base, Observation } from "./types.ts";

const made: string[] = [];

type Opened = { readonly root: string; readonly schema: Schema; readonly base: Base };

const opened = async (): Promise<Opened> => {
  const root = `${fs.mkdtempSync(`${os.tmpdir()}/ambient-write-`)}/home`;
  made.push(root);
  const home = openHome(root);
  if ("problems" in home) throw new Error("openHome refused the temp directory");
  expect(await home.converge()).toStrictEqual([]);
  const global = home.read();
  if ("problems" in global) throw new Error("home.read refused a converged home");
  return { root, schema: global.schema, base: open(home.knowledge) };
};

/** What `observe.from` proposes for a bare sender label — no aliases, no numbers. */
const zeeshan: Observation = {
  type: "Person",
  name: "Zeeshan",
  frontmatter: { aliases: [], numbers: [], status: "unreviewed", source: "history" },
};

it("writes one Observation as one document, and reports it as `${type}/${name}`", async () => {
  const { root, schema, base } = await opened();
  const report = await base.write(schema, [zeeshan]);
  expect(report).toStrictEqual({ wrote: ["Person/Zeeshan"], refused: [] });
  expect(fs.readFileSync(`${root}/knowledge/person/zeeshan.md`, "utf8")).toStrictEqual(
    "---\ntype: Person\nname: Zeeshan\naliases: []\nnumbers: []\nstatus: unreviewed\nsource: history\n---\n",
  );
});

it("row 16 — a missing required field is a Refusal, and nothing reaches disk", async () => {
  const { root, schema, base } = await opened();
  const bare: Observation = {
    ...zeeshan,
    frontmatter: { status: "unreviewed", source: "history" },
  };

  const report = await base.write(schema, [bare]);
  expect(report.wrote).toStrictEqual([]);
  expect(report.refused.map((r) => describeViolation({ at: r.at, detail: r.why }))).toStrictEqual([
    'Person/Zeeshan: missing key "aliases" — expected text[]',
    'Person/Zeeshan: missing key "numbers" — expected text[]',
  ]);
  expect(fs.existsSync(`${root}/knowledge/person`)).toBe(false);
});

it("row 17 — a type absent from schema.yaml is refused the same way", async () => {
  const { root, schema, base } = await opened();
  const alien: Observation = { type: "Meeting", name: "Standup", frontmatter: {} };

  const report = await base.write(schema, [alien]);
  expect(report.wrote).toStrictEqual([]);
  expect(report.refused.map((r) => describeViolation({ at: r.at, detail: r.why }))).toStrictEqual([
    'Meeting/Standup: unknown type "Meeting" (known: Person, Organization, Commitment, Issue, Media, Chat)',
  ]);
  expect(fs.existsSync(`${root}/knowledge`)).toBe(true);
  expect(fs.readdirSync(`${root}/knowledge`).sort()).toStrictEqual([".ok", ".okignore"]);
});

it("a refused Observation does not block the ones beside it from writing", async () => {
  const { schema, base } = await opened();
  const bare: Observation = { ...zeeshan, name: "Ghost", frontmatter: {} };

  const report = await base.write(schema, [bare, zeeshan]);
  expect(report.wrote).toStrictEqual(["Person/Zeeshan"]);
  expect(report.refused).toHaveLength(4);
  expect(report.refused.every((r) => r.at === "Person/Ghost")).toBe(true);
});

afterEach(() => {
  for (const root of made.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const hasOk = spawnSync("ok", ["--version"]).error === undefined;

/**
 * ADR 007 falsifier 1, and the only place in this repository where running
 * `ok` is legitimate — a test of the format trade, not the product using the
 * tool. Skipped, not deleted, when `ok` is not on `PATH`; the title says why.
 */
(hasOk ? it : it.skip)(
  hasOk
    ? "row 18 — a document base.write wrote is found and passed by ok preview and ok lint"
    : "row 18 — skipped: `ok` is not on PATH in this environment",
  async () => {
    const { root, schema, base } = await opened();
    await base.write(schema, [zeeshan]);
    const dir = `${root}/knowledge`;

    const preview = execFileSync("ok", ["preview", "--cwd", dir], { encoding: "utf8" });
    expect(preview).toContain("Found 1 markdown files");

    const lintOut: unknown = JSON.parse(
      execFileSync("ok", ["lint", "--cwd", dir, "--json"], { encoding: "utf8" }),
    );
    expect(lintOut).toMatchObject({
      fileCount: 1,
      errorCount: 0,
      files: [{ file: "person/zeeshan.md", diagnostics: [] }],
    });
  },
);

// ── the write boundary defends the base against the names in a Transcript ──

/** `slugOf` is not injective: `"A B"` and `"A/B"` both reach `a-b`. */
const named = (name: string): Observation => ({ ...zeeshan, name });

it("refuses the second of two names that reach one slug, and writes only the first", async () => {
  const { root, schema, base } = await opened();
  const report = await base.write(schema, [named("A B"), named("A/B")]);

  expect(report.wrote).toStrictEqual(["Person/A B"]);
  expect(report.refused.map((r) => describeViolation({ at: r.at, detail: r.why }))).toStrictEqual([
    'Person/A/B: slug "person/a-b.md" is already taken by Person/A B',
  ]);
  // The survivor is the one that was reported, not the one that ran last.
  expect(fs.readFileSync(`${root}/knowledge/person/a-b.md`, "utf8")).toContain("name: A B");
  expect(fs.readdirSync(`${root}/knowledge/person`)).toStrictEqual(["a-b.md"]);
});

it("refuses rather than replacing a document already on disk", async () => {
  const { root, schema, base } = await opened();
  expect((await base.write(schema, [named("A B")])).wrote).toStrictEqual(["Person/A B"]);

  const path = `${root}/knowledge/person/a-b.md`;
  fs.writeFileSync(path, "---\ntype: Person\nname: A B\n---\n\n# corrected by hand\n");
  const before = fs.readFileSync(path);

  // A different identity, same slug, arriving in a later pass.
  const report = await base.write(schema, [named("A/B")]);
  expect(report.wrote).toStrictEqual([]);
  expect(report.refused).toHaveLength(1);
  expect(fs.readFileSync(path).equals(before)).toBe(true);
  expect(fs.readdirSync(`${root}/knowledge/person`)).toStrictEqual(["a-b.md"]);
});

it("refuses a destination folder that is a link out of the base", async () => {
  const { root, schema, base } = await opened();
  const outside = `${root}/../outside-person`;
  fs.mkdirSync(outside, { recursive: true });
  fs.symlinkSync(outside, `${root}/knowledge/person`);

  const report = await base.write(schema, [zeeshan]);
  expect(report.wrote).toStrictEqual([]);
  expect(report.refused.map((r) => describeViolation({ at: r.at, detail: r.why }))).toStrictEqual([
    "Person/Zeeshan: not a regular file — the base is read from files, never through a link or a pipe",
  ]);
  expect(fs.readdirSync(outside)).toStrictEqual([]);
});

it("does not let a proposal's frontmatter overwrite the identity that chose its path", async () => {
  const { root, schema, base } = await opened();
  const lying: Observation = {
    type: "Person",
    name: "Zeeshan",
    frontmatter: { ...zeeshan.frontmatter, type: "Organization", name: "Somebody Else" },
  };

  expect((await base.write(schema, [lying])).wrote).toStrictEqual(["Person/Zeeshan"]);
  const text = fs.readFileSync(`${root}/knowledge/person/zeeshan.md`, "utf8");
  // The bytes name the document its path names, and `type`/`name` stay at the top.
  expect(text).toStrictEqual(
    "---\ntype: Person\nname: Zeeshan\naliases: []\nnumbers: []\nstatus: unreviewed\nsource: history\n---\n",
  );
  expect(fs.existsSync(`${root}/knowledge/organization`)).toBe(false);
});

/**
 * `mkdir` throws EEXIST when the folder's name is taken by a regular file, and that
 * says nothing about the document's destination — reporting it as a taken slug names
 * a path nothing looked at. Only `link` failing means the slug is held.
 */
it("does not call a directory that is a file a slug collision", async () => {
  const { root, schema, base } = await opened();
  fs.writeFileSync(`${root}/knowledge/person`, "not a directory\n");

  const report = await base.write(schema, [zeeshan]);
  expect(report.wrote).toStrictEqual([]);
  expect(report.refused).toHaveLength(1);
  const said = describeViolation({ at: report.refused[0].at, detail: report.refused[0].why });
  expect(said).toContain("Person/Zeeshan: unreadable");
  expect(said).not.toContain("already taken");
});
