/**
 * `cli` through its own interface — argv in, an outcome out — plus one end-to-end
 * spawn, because exit codes are the vocabulary the gate is written in and only
 * the real process can prove them.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { describe as render } from "../home/service.ts";
import { run } from "./service.ts";
import type { Outcome } from "./types.ts";

const made: string[] = [];

const tmp = (): string => {
  const dir = fs.mkdtempSync(`${os.tmpdir()}/ambient-cli-`);
  made.push(dir);
  return `${dir}/home`;
};

afterEach(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const said = (outcome: Outcome): string =>
  outcome.kind === "report" ? outcome.problems.map(render).join("\n") : outcome.said;

it("init then doctor is silent; a broken home is not", async () => {
  const root = tmp();
  expect(await run(["init", "--home", root], "/nowhere")).toEqual({ kind: "report", problems: [] });
  expect(await run(["doctor", "--home", root], "/nowhere")).toEqual({
    kind: "report",
    problems: [],
  });

  fs.rmSync(`${root}/schema.yaml`);
  expect(said(await run(["doctor", "--home", root], "/nowhere"))).toBe("schema.yaml: missing");
});

it("chat add and agent add scaffold through the same verb", async () => {
  const root = tmp();
  await run(["init", "--home", root], "/nowhere");
  expect(await run(["chat", "add", "bug-reports", "--home", root], "/nowhere")).toEqual({
    kind: "report",
    problems: [],
  });
  expect(await run(["agent", "add", "linear", "--home", root], "/nowhere")).toEqual({
    kind: "report",
    problems: [],
  });
  expect(said(await run(["doctor", "--home", root], "/nowhere"))).toBe("");
});

it("a wrong command line is misuse, never confusable with an unhealthy home", async () => {
  expect(await run([], "/nowhere")).toMatchObject({ kind: "misuse" });
  expect(await run(["--home"], "/nowhere")).toEqual({
    kind: "misuse",
    said: "--home needs a path",
  });
  expect(await run(["chat"], "/nowhere")).toEqual({
    kind: "misuse",
    said: "usage: ambient chat add <slug>",
  });
  expect(said(await run(["bogus"], "/nowhere"))).toContain('unknown command "bogus"');
});

it("`--home` beats the default root", async () => {
  const root = tmp();
  await run(["init", "--home", root], `${tmp()}/never-touched`);
  expect(fs.existsSync(`${root}/identity.md`)).toBe(true);
});

const archive = (last = ""): string =>
  ["[14/02/2025, 4:06:10 PM] Rex: one", "[15/02/2025, 4:07:00 PM] Sam: two", last]
    .filter(Boolean)
    .join("\n");

it("imports a text Archive idempotently, appends newer Messages, and can re-Zone", async () => {
  const root = tmp();
  const input = `${root}.txt`;
  await run(["init", "--home", root], "/nowhere");
  await run(["chat", "add", "fixture", "--home", root], "/nowhere");
  fs.writeFileSync(input, archive());

  expect(
    await run(
      ["import", input, "--into", "fixture", "--zone", "Africa/Accra", "--home", root],
      "/nowhere",
    ),
  ).toEqual({
    kind: "message",
    ok: true,
    said: "Imported 2 Messages into fixture using Zone Africa/Accra",
  });
  const transcript = `${root}/chats/fixture/transcript.jsonl`;
  const first = fs.readFileSync(transcript);

  await run(
    ["import", input, "--into", "fixture", "--zone", "Africa/Accra", "--home", root],
    "/nowhere",
  );
  expect(fs.readFileSync(transcript)).toEqual(first);

  fs.writeFileSync(input, archive("[16/02/2025, 4:08:00 PM] Rex: three"));
  await run(
    ["import", input, "--into", "fixture", "--zone", "Africa/Accra", "--home", root],
    "/nowhere",
  );
  expect(fs.readFileSync(transcript, "utf8").trim().split("\n")).toHaveLength(3);

  await run(
    ["import", input, "--into", "fixture", "--zone", "America/New_York", "--home", root],
    "/nowhere",
  );
  const rezoned = fs.readFileSync(transcript, "utf8").trim().split("\n");
  expect(rezoned).toHaveLength(3);
  expect(rezoned.every((line) => line.includes('"zone":"America/New_York"'))).toBe(true);
});

it("prints a default Zone and refuses a missing Chat before writing", async () => {
  const root = tmp();
  const input = `${root}.txt`;
  await run(["init", "--home", root], "/nowhere");
  fs.writeFileSync(input, archive());

  expect(
    await run(["import", input, "--into", "missing", "--home", root], "/nowhere", "Africa/Accra"),
  ).toEqual({
    kind: "message",
    ok: false,
    said: 'Chat "missing" does not exist; run `ambient chat add missing` first',
  });
  expect(fs.existsSync(`${root}/chats/missing/transcript.jsonl`)).toBe(false);
  expect(ambient(root, "import", input, "--into", "missing")).toMatchObject({ code: 1 });

  await run(["chat", "add", "fixture", "--home", root], "/nowhere");
  expect(
    await run(["import", input, "--into", "fixture", "--home", root], "/nowhere", "Africa/Accra"),
  ).toMatchObject({ said: "Imported 2 Messages into fixture using default Zone Africa/Accra" });
  const hash = createHash("sha256").update(archive()).digest("hex");
  const receipt: unknown = JSON.parse(
    fs.readFileSync(`${root}/chats/fixture/imports/${hash}/receipt.json`, "utf8"),
  );
  expect(receipt).toMatchObject({ zone: { name: "Africa/Accra", source: "default" } });
  expect(
    await run(
      ["import", input, "--into", "fixture", "--zone", "+00:00", "--home", root],
      "/nowhere",
    ),
  ).toMatchObject({ kind: "message", ok: false });
});

it("streams ZIP media into the global Blob store and prints unresolved Markers", async () => {
  const root = tmp();
  const input = `${root}.zip`;
  const encoded = fs.readFileSync(
    `${import.meta.dirname}/../archive/fixtures/media.zip.base64`,
    "utf8",
  );
  const zip = Buffer.from(encoded.trim(), "base64");
  const archiveHash = createHash("sha256").update(zip).digest("hex");
  fs.writeFileSync(input, zip);
  await run(["init", "--home", root], "/nowhere");
  await run(["chat", "add", "fixture", "--home", root], "/nowhere");

  expect(
    await run(
      ["import", input, "--into", "fixture", "--zone", "Africa/Accra", "--home", root],
      "/nowhere",
    ),
  ).toEqual({
    kind: "message",
    ok: true,
    said: "Imported 3 Messages into fixture using Zone Africa/Accra; 1 unresolved Marker",
  });
  const transcript = fs.readFileSync(`${root}/chats/fixture/transcript.jsonl`, "utf8");
  const hashes = [...transcript.matchAll(/"hash":"([a-f0-9]{64})"/g)].map((match) => match[1]);
  expect(hashes).toHaveLength(2);
  expect(new Set(hashes).size).toBe(1);
  expect(transcript).toContain('"media":{"state":"NoHandle","why":"not-in-archive"}');
  expect(fs.readdirSync(`${root}/blobs`)).toEqual([hashes[0]]);
  expect(fs.existsSync(`${root}/chats/fixture/media`)).toBe(false);
  expect(
    fs.readFileSync(`${root}/chats/fixture/imports/${archiveHash}/_chat.txt`, "utf8"),
  ).toContain("photo–one.jpg");
  const receipt: unknown = JSON.parse(
    fs.readFileSync(`${root}/chats/fixture/imports/${archiveHash}/receipt.json`, "utf8"),
  );
  expect(receipt).toMatchObject({
    archive: { sha256: archiveHash, bytes: zip.byteLength, form: "zip-media" },
    counts: { markers: 3, resolved: 2, unresolved: 1 },
    findings: [{ kind: "unresolved-markers", count: 1 }],
  });
});

// ── the exit codes the gate is written in ────────────────────────────

const ambient = (root: string, ...args: readonly string[]) => {
  const run = spawnSync(
    process.execPath,
    [
      "--import",
      `${import.meta.dirname}/../../../scripts/module-aliases.ts`,
      `${import.meta.dirname}/../../main.ts`,
      ...args,
    ],
    { encoding: "utf8", env: { ...process.env, AMBIENT_HOME: root } },
  );
  return { code: run.status, out: run.stdout };
};

it("the CLI exits 0 on a healthy home and 1 on a broken one, printing what is wrong", () => {
  const root = tmp();
  expect(ambient(root, "doctor")).toMatchObject({ code: 1 });
  expect(ambient(root, "init")).toEqual({ code: 0, out: "" });
  expect(ambient(root, "doctor")).toEqual({ code: 0, out: "" });
  expect(ambient(root, "chat", "add", "bug-reports")).toEqual({ code: 0, out: "" });
  expect(ambient(root, "agent", "add", "linear")).toEqual({ code: 0, out: "" });

  fs.rmSync(`${root}/chats/bug-reports/mandate.md`);
  expect(ambient(root, "doctor")).toEqual({
    code: 1,
    out: "chats/bug-reports/mandate.md: missing\n",
  });

  expect(ambient(root, "bogus")).toMatchObject({ code: 2, out: "" });
});
