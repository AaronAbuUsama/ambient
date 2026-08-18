/**
 * `ingest` end to end: a real seeded mirror, a real temp home, real files.
 *
 * No credential and no socket — `whatsappd/testing` drives a session that never
 * opens one, so the runtime lands the batch through its own durable path and every
 * read below is the read path production uses.
 */

import * as fs from "node:fs";
import { afterEach, expect, it } from "vite-plus/test";
import {
  CONVERSATION,
  MEDIA_BYTES,
  PEER,
  seedAccount,
  temporaryHome,
} from "~/modules/channel/testing.ts";
import type { Account } from "~/modules/channel/types.ts";
import type { Place } from "~/modules/home/types.ts";
import { readTranscript, writeTranscript } from "~/modules/transcript/service.ts";
import type { ArchiveMessage } from "~/modules/transcript/types.ts";
import { describe, runIngest, summarise } from "./service.ts";

const made: string[] = [];
afterEach(() => {
  for (const root of made.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

type Fixture = {
  readonly account: Account;
  readonly transcript: Place;
  readonly blobs: Place;
};

/** A converged home, a Chat, and one Source seeded with the canonical conversation. */
const fixture = async (): Promise<Fixture> => {
  const at = await temporaryHome("live");
  made.push(at.root);
  if ((await at.home.chat("fixture").converge()).length > 0) {
    throw new Error("the Chat did not converge");
  }
  const transcript = at.home.chat("fixture").transcript();
  if ("problems" in transcript) throw new Error("home refused the Transcript Place");
  const paired = await seedAccount(at.account, CONVERSATION);
  if ("problems" in paired) throw new Error(JSON.stringify(paired.problems));
  return { account: at.account, transcript, blobs: at.home.blobs };
};

const archive = (text: string): ArchiveMessage => ({
  from: "archive",
  kind: "message",
  wall: "14/02/2025, 4:06:10 PM",
  at: Date.parse("2025-02-14T16:06:10Z"),
  zone: "Africa/Accra",
  who: { label: "Rex" },
  text,
});

it("row 6 · 7 · 8 — one line per message, all Live, and the bytes are ours", async () => {
  const where = await fixture();
  const report = await runIngest({
    account: where.account,
    peer: PEER,
    transcript: where.transcript,
    blobs: where.blobs,
  });
  if ("problems" in report) throw new Error(JSON.stringify(report.problems));

  expect(report).toMatchObject({
    written: 5,
    skipped: 0,
    read: 5,
    // Two lines carry media; the Source holds bytes for one of them.
    media: { seen: 2, stored: 1, unresolved: 1 },
    blobs: 1,
  });
  expect(report.revision).toBeGreaterThan(0);

  const lines = await readTranscript(where.transcript);
  if ("problems" in lines) throw new Error("the Transcript is unreadable");
  expect(lines).toHaveLength(5);
  expect(lines.every((line) => line.from === "live")).toBe(true);

  const photo = lines.find((line) => line.from === "live" && line.id === "m-media");
  if (photo === undefined || photo.from !== "live" || photo.media?.state !== "Stored") {
    throw new Error("the media line did not resolve to a Blob");
  }
  // Our hash, our store — never whatsappd's ref.
  expect(photo.media.hash).toMatch(/^[0-9a-f]{64}$/);
  expect(fs.existsSync(`${where.blobs.path}/${photo.media.hash}`)).toBe(true);
  expect(Uint8Array.from(fs.readFileSync(`${where.blobs.path}/${photo.media.hash}`))).toEqual(
    MEDIA_BYTES,
  );
  expect(summarise(report, "fixture")).toContain("1 attachment stored as 1 Blob");
});

it("row 11 — ingesting twice appends nothing and leaves the file byte-identical", async () => {
  const where = await fixture();
  const request = {
    account: where.account,
    peer: PEER,
    transcript: where.transcript,
    blobs: where.blobs,
  };
  expect("problems" in (await runIngest(request))).toBe(false);

  const before = fs.readFileSync(where.transcript.path);
  const inode = fs.statSync(where.transcript.path).ino;
  const again = await runIngest(request);
  if ("problems" in again) throw new Error(JSON.stringify(again.problems));

  expect(again).toMatchObject({ written: 0, skipped: 5 });
  expect(fs.readFileSync(where.transcript.path)).toEqual(before);
  expect(fs.statSync(where.transcript.path).ino).toBe(inode);
  expect(summarise(again, "fixture")).toContain("Re-ingested");
});

it("row 14 — ingesting onto Archive lines appends only Live ones and touches neither", async () => {
  const where = await fixture();
  const history = [archive("history one"), archive("history two")];
  expect("problems" in (await writeTranscript(where.transcript, history))).toBe(false);
  const before = fs.readFileSync(where.transcript.path);

  const report = await runIngest({
    account: where.account,
    peer: PEER,
    transcript: where.transcript,
    blobs: where.blobs,
  });
  if ("problems" in report) throw new Error(JSON.stringify(report.problems));
  expect(report).toMatchObject({ written: 5, skipped: 0 });

  const after = fs.readFileSync(where.transcript.path);
  // The Archive lines are the FIRST bytes of the file and are untouched, byte for byte.
  expect(after.subarray(0, before.length)).toEqual(before);
  const lines = await readTranscript(where.transcript);
  if ("problems" in lines) throw new Error("the Transcript is unreadable");
  expect(lines.slice(0, 2)).toEqual(history);
  expect(lines.slice(2).every((line) => line.from === "live")).toBe(true);
});

it("an unpaired account refuses, and says to pair rather than reporting an empty read", async () => {
  const where = await fixture();
  const report = await runIngest({
    account: {
      ...where.account,
      store: { ...where.account.store, path: `${where.account.store.path}.missing` },
    },
    peer: PEER,
    transcript: where.transcript,
    blobs: where.blobs,
  });
  if (!("problems" in report)) throw new Error("an unpaired account was ingested");
  expect(report.problems[0]?._tag).toBe("ChannelRefused");
  expect(describe(report.problems[0]!)).toContain("run `ambient pair` first");
  expect(fs.existsSync(where.transcript.path)).toBe(false);
});
