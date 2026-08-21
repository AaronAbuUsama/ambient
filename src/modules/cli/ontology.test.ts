/**
 * `ambient ontology lint` — gate rows 8 and 9 of
 * [`docs/planning/knowledge/spec.md`](../../../docs/planning/knowledge/spec.md).
 *
 * Driven through `run(argv, defaultRoot)`, the real interface, plus one spawn of
 * `src/main.ts` per row: *"exits 0 and prints nothing"* is a claim about a
 * process, and only a process can prove it.
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

it("a wrong ontology command line is misuse, never a violation", async () => {
  const root = tmp();
  await run(["init", "--home", root], "/nowhere");
  expect(await run(["ontology", "--home", root], "/nowhere")).toStrictEqual({
    kind: "misuse",
    said: "usage: ambient ontology lint",
  });
  expect(await run(["ontology", "lint", "extra", "--home", root], "/nowhere")).toStrictEqual({
    kind: "misuse",
    said: "usage: ambient ontology lint",
  });
});
