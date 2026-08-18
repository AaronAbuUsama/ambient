/**
 * The Live-account verbs through argv only — `pair`, `peers`, `ingest`.
 *
 * Gate rows 2, 3, 4, 5 and 15. The two refusals are the point: reading a
 * conversation nobody opted into is the one mistake these verbs must never make,
 * and both happen **before any I/O**.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";
import { CONVERSATION, PEER, seedAccount } from "~/modules/channel/testing.ts";
import { openHome } from "~/modules/home/service.ts";
import { run } from "./service.ts";

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const root = (): string => {
  const dir = fs.mkdtempSync(`${os.tmpdir()}/ambient-live-`);
  made.push(dir);
  return `${dir}/home`;
};

/** A home whose `config.yaml` declares one Live Source, with `allow` as given. */
const configured = async (allow: readonly string[]): Promise<string> => {
  const where = root();
  await run(["init", "--home", where], "/nowhere");
  await run(["chat", "add", "fixture", "--home", where], "/nowhere");
  const path = `${where}/config.yaml`;
  const list = allow.length === 0 ? " []" : `\n${allow.map((id) => `      - "${id}"`).join("\n")}`;
  const source = [`  live:`, `    kind: whatsapp`, `    mode: ingest`, `    allow:${list}`].join(
    "\n",
  );
  // Into the `sources` map, not onto the end of the file — a Source declared under
  // `roles` is a different document that happens to parse.
  fs.writeFileSync(
    path,
    fs.readFileSync(path, "utf8").replace(/^sources:.*$/m, (line) => `${line}\n${source}`),
  );
  return where;
};

/** Point the Chat at a Peer, the way a human edits its `config.yaml`. */
const bind = (where: string, peer: string, source = "live"): void => {
  const path = `${where}/chats/fixture/config.yaml`;
  const config = fs.readFileSync(path, "utf8");
  fs.writeFileSync(
    path,
    config.replace(/^source:.*$/m, `source: ${source}`).replace(/^peer:.*$/m, `peer: "${peer}"`),
  );
};

/** Seed the `live` Source of an existing home with the canonical conversation. */
const seed = async (where: string): Promise<void> => {
  const home = openHome(where);
  if ("problems" in home) throw new Error("openHome refused");
  const source = home.source("live");
  expect(await source.converge()).toEqual([]);
  const store = source.store();
  const media = source.media();
  if ("problems" in store || "problems" in media) throw new Error("home refused a Place");
  const paired = await seedAccount({ name: "live", store, media }, CONVERSATION);
  if ("problems" in paired) throw new Error(JSON.stringify(paired.problems));
};

it("misuses the command line rather than guessing", async () => {
  const where = await configured([]);
  expect(await run(["pair", "--home", where], "/nowhere")).toMatchObject({ kind: "misuse" });
  expect(await run(["peers", "a", "b", "--home", where], "/nowhere")).toMatchObject({
    kind: "misuse",
  });
  expect(await run(["ingest", "fixture", "--home", where], "/nowhere")).toMatchObject({
    kind: "misuse",
  });
});

it("refuses a Source that is not in config.yaml, before touching disk", async () => {
  const where = await configured([]);
  const outcome = await run(["peers", "ghost", "--home", where], "/nowhere");
  expect(outcome).toMatchObject({ kind: "message", ok: false });
  expect(fs.existsSync(`${where}/sources/ghost`)).toBe(false);
});

it("row 3 — peers against an unpaired Source exits non-zero, names the file, and writes nothing", async () => {
  const where = await configured([]);
  const outcome = await run(["peers", "live", "--home", where], "/nowhere");
  if (outcome.kind !== "message") throw new Error("expected a message");
  expect(outcome.ok).toBe(false);
  expect(outcome.said).toContain("whatsapp.db");
  expect(outcome.said).toContain("ambient pair");
  expect(fs.existsSync(`${where}/sources/live/whatsapp.db`)).toBe(false);
});

it("row 2 · 15 — peers lists the conversations with no socket, no lease and no runtime", async () => {
  const where = await configured([PEER]);
  await seed(where);
  const outcome = await run(["peers", "live", "--home", where], "/nowhere");
  if (outcome.kind !== "message") throw new Error("expected a message");
  expect(outcome.ok).toBe(true);
  expect(outcome.said).toContain(PEER);
  expect(outcome.said).toContain("Alice");
  expect(outcome.said).toContain("5");
});

it("row 4 — a Chat with no peer refuses, names the file to edit, and writes nothing", async () => {
  const where = await configured([PEER]);
  await seed(where);
  const outcome = await run(["ingest", "--into", "fixture", "--home", where], "/nowhere");
  if (outcome.kind !== "message") throw new Error("expected a message");
  expect(outcome.ok).toBe(false);
  expect(outcome.said).toContain("config.yaml");
  expect(fs.existsSync(`${where}/chats/fixture/transcript.jsonl`)).toBe(false);
});

it("row 5 — a Peer absent from the Source's allow list refuses, and reads nothing", async () => {
  const where = await configured([]);
  await seed(where);
  bind(where, PEER);
  const outcome = await run(["ingest", "--into", "fixture", "--home", where], "/nowhere");
  if (outcome.kind !== "message") throw new Error("expected a message");
  expect(outcome.ok).toBe(false);
  expect(outcome.said).toContain("allow list");
  expect(fs.existsSync(`${where}/chats/fixture/transcript.jsonl`)).toBe(false);
});

it("ingests an allowed Peer end to end, and says what it did", async () => {
  const where = await configured([PEER]);
  await seed(where);
  bind(where, PEER);
  const outcome = await run(["ingest", "--into", "fixture", "--home", where], "/nowhere");
  if (outcome.kind !== "message") throw new Error("expected a message");
  expect(outcome.ok).toBe(true);
  expect(outcome.said).toContain("Ingested 5 Transcript lines");
  expect(
    fs.readFileSync(`${where}/chats/fixture/transcript.jsonl`, "utf8").trim().split("\n"),
  ).toHaveLength(5);

  // The home stays healthy with a Source directory in it — `doctor` knows the unit.
  expect(await run(["doctor", "--home", where], "/nowhere")).toEqual({
    kind: "report",
    problems: [],
  });
});

it("a chat that does not exist names `chat add` rather than failing obscurely", async () => {
  const where = await configured([PEER]);
  const outcome = await run(["ingest", "--into", "ghost", "--home", where], "/nowhere");
  if (outcome.kind !== "message") throw new Error("expected a message");
  expect(outcome.ok).toBe(false);
  expect(outcome.said).toContain("ambient chat add ghost");
});
