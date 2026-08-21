/**
 * `ambient ontology lint | next | index` — gate rows 8, 9, 10 and 11 of
 * [`docs/planning/knowledge/spec.md`](../../../docs/planning/knowledge/spec.md).
 *
 * Driven through `run(argv, defaultRoot)`, the real interface, plus one spawn of
 * `src/main.ts` per row: *"exits 0 and prints nothing"* is a claim about a
 * process, and only a process can prove it. Row 11's byte-identity claim is the
 * same reason — a re-run is only a re-run if it goes through `ambient` again.
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { run } from "./service.ts";

const made: string[] = [];

const tmp = (): string => {
  const dir = fs.mkdtempSync(`${os.tmpdir()}/ambient-ontology-`);
  made.push(dir);
  return `${dir}/home`;
};

afterEach(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const ambient = (root: string, ...args: readonly string[]) => {
  const spawned = spawnSync(
    process.execPath,
    [
      "--import",
      `${import.meta.dirname}/../../../scripts/module-aliases.ts`,
      `${import.meta.dirname}/../../main.ts`,
      ...args,
    ],
    { encoding: "utf8", env: { ...process.env, AMBIENT_HOME: root } },
  );
  return { code: spawned.status, out: spawned.stdout, err: spawned.stderr };
};

/** Written with `fs` alone. `observe` is ticket 04; this Slice's writer does not exist yet. */
const wrote = (root: string, at: string, keys: readonly string[]): void => {
  const path = `${root}/knowledge/${at}`;
  fs.mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  fs.writeFileSync(path, `---\n${keys.join("\n")}\n---\n\n# Zeeshan\n`);
};

const PERSON = [
  "type: Person",
  "name: Zeeshan",
  "aliases:",
  "  - Zee",
  "numbers: []",
  "status: unreviewed",
  "source: history",
];

const AARON = [
  "type: Person",
  "name: Aaron",
  "aliases: []",
  "numbers: []",
  "status: unreviewed",
  "source: history",
];

const REVIEWED = [
  "type: Person",
  "name: Reviewed",
  "aliases: []",
  "numbers: []",
  "status: reviewed",
  "source: history",
];

const ORG = [
  "type: Organization",
  "name: Capxul",
  "aliases: []",
  "status: unreviewed",
  "source: history",
];

it("names the file, the key and the expected form of a missing required field", async () => {
  const root = tmp();
  await run(["init", "--home", root], "/nowhere");
  wrote(root, "person/zeeshan.md", PERSON.slice(0, -1));

  expect(await run(["ontology", "lint", "--home", root], "/nowhere")).toStrictEqual({
    kind: "message",
    ok: false,
    said: 'person/zeeshan.md: missing key "source" — expected enum(history|witnessed)',
  });
  expect(ambient(root, "ontology", "lint")).toStrictEqual({
    code: 1,
    out: "",
    err: 'person/zeeshan.md: missing key "source" — expected enum(history|witnessed)\n',
  });
});

it("exits 0 and prints nothing on a clean base", async () => {
  const root = tmp();
  await run(["init", "--home", root], "/nowhere");
  wrote(root, "person/zeeshan.md", PERSON);

  expect(await run(["ontology", "lint", "--home", root], "/nowhere")).toStrictEqual({
    kind: "report",
    problems: [],
  });
  expect(ambient(root, "ontology", "lint")).toStrictEqual({ code: 0, out: "", err: "" });
});

const USAGE =
  "usage: ambient ontology lint | ambient ontology next [--type=<type>] [--limit=<n>] | ambient ontology index";

it("a wrong ontology command line is misuse, never a violation", async () => {
  const root = tmp();
  await run(["init", "--home", root], "/nowhere");
  expect(await run(["ontology", "--home", root], "/nowhere")).toStrictEqual({
    kind: "misuse",
    said: USAGE,
  });
  expect(await run(["ontology", "lint", "extra", "--home", root], "/nowhere")).toStrictEqual({
    kind: "misuse",
    said: USAGE,
  });
  expect(await run(["ontology", "next", "--bogus", "--home", root], "/nowhere")).toStrictEqual({
    kind: "misuse",
    said: USAGE,
  });
  expect(await run(["ontology", "next", "--limit=zero", "--home", root], "/nowhere")).toStrictEqual(
    {
      kind: "misuse",
      said: USAGE,
    },
  );
  expect(await run(["ontology", "index", "extra", "--home", root], "/nowhere")).toStrictEqual({
    kind: "misuse",
    said: USAGE,
  });
});

// ── gate row 10 — the work queue ─────────────────────────────────────

it("gate row 10 — next returns only status: unreviewed documents, narrowed by type and capped by limit", async () => {
  const root = tmp();
  await run(["init", "--home", root], "/nowhere");
  wrote(root, "person/zeeshan.md", PERSON);
  wrote(root, "person/aaron.md", AARON);
  wrote(root, "person/reviewed.md", REVIEWED);
  wrote(root, "organization/capxul.md", ORG);

  const args = ["ontology", "next", "--type=person", "--limit=20"];
  expect(await run([...args, "--home", root], "/nowhere")).toStrictEqual({
    kind: "message",
    ok: true,
    said: "person/aaron.md\nperson/zeeshan.md",
  });
  expect(ambient(root, ...args)).toStrictEqual({
    code: 0,
    out: "person/aaron.md\nperson/zeeshan.md\n",
    err: "",
  });
});

it("a quiet work queue prints nothing and exits 0 — nothing unreviewed, nothing spent", async () => {
  const root = tmp();
  await run(["init", "--home", root], "/nowhere");
  wrote(root, "person/reviewed.md", REVIEWED);

  expect(await run(["ontology", "next", "--home", root], "/nowhere")).toStrictEqual({
    kind: "report",
    problems: [],
  });
  expect(ambient(root, "ontology", "next")).toStrictEqual({ code: 0, out: "", err: "" });
});

// ── gate row 11 — the derived index ──────────────────────────────────

/**
 * The one with teeth: an index that is not reproducible is not actually
 * derived. Bytes off disk, not a parsed object, and through the real
 * `ambient` process both times — a re-run is only a re-run if it goes through
 * `ambient` again.
 */
it("gate row 11 — index writes home.index, and deleting then re-running reproduces it byte-identically", async () => {
  const root = tmp();
  await run(["init", "--home", root], "/nowhere");
  wrote(root, "person/zeeshan.md", PERSON);
  wrote(root, "organization/capxul.md", ORG);
  const indexPath = `${root}/index.json`;

  expect(ambient(root, "ontology", "index")).toStrictEqual({ code: 0, out: "", err: "" });
  expect(fs.existsSync(indexPath)).toBe(true);
  expect(indexPath.startsWith(`${root}/knowledge/`)).toBe(false);
  const first = fs.readFileSync(indexPath);

  fs.rmSync(indexPath);
  expect(ambient(root, "ontology", "index")).toStrictEqual({ code: 0, out: "", err: "" });
  const second = fs.readFileSync(indexPath);

  expect(second.equals(first)).toBe(true);
});
