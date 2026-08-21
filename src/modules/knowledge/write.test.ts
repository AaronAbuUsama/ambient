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
