/**
 * A `MessageRecord` becoming a Transcript line — gate rows 7, 8, 9 and 10.
 *
 * The mirror is current state, so every assertion below is about a **projection**
 * and never a fold: the edit has already replaced the content, the revoke has
 * already replaced the arm, and the reaction set is the live set.
 */

import * as fs from "node:fs";
import { afterEach, expect, it } from "vite-plus/test";
import { textMessage } from "whatsappd/testing";

import { openMirror } from "./service.ts";
import { AT, CONVERSATION, MEDIA_BYTES, PEER, seedAccount, temporaryHome } from "./testing.ts";
import type { Mirror, PeerRead } from "./types.ts";
import type { SeedBatch, TemporaryHome } from "./testing.ts";

const made: string[] = [];
afterEach(() => {
  for (const root of made.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const read = async (
  seed: SeedBatch = CONVERSATION,
): Promise<{ readonly read: PeerRead; readonly mirror: Mirror; readonly at: TemporaryHome }> => {
  const at = await temporaryHome();
  made.push(at.root);
  const paired = await seedAccount(at.account, seed);
  if ("problems" in paired) throw new Error(JSON.stringify(paired.problems));
  const mirror = await openMirror(at.account);
  if ("problems" in mirror) throw new Error(JSON.stringify(mirror.problems));
  const found = await mirror.read(PEER);
  if ("problems" in found) throw new Error(JSON.stringify(found.problems));
  return { read: found, mirror, at };
};

it("row 7 · 10 — every line is Live, oldest first, and carries its edit, revoke and reactions", async () => {
  const { read: found, mirror } = await read();
  await mirror.close();

  expect(found.lines.map((entry) => entry.line.id)).toEqual([
    "m-1",
    "m-2",
    "m-3",
    "m-media",
    "m-broken",
  ]);
  expect(found.lines.every((entry) => entry.line.from === "live")).toBe(true);
  expect(found.revision).toBeGreaterThan(0);

  const byId = new Map(found.lines.map((entry) => [entry.line.id, entry.line]));
  // Reactions are state on their message. NO reaction line is written — five
  // messages produce five lines, and the union has no arm to put one in.
  expect(byId.get("m-1")?.reactions).toEqual([
    { subject: PEER, emoji: "👍", by: PEER, at: AT + 30 },
  ]);
  expect(byId.get("m-2")?.text).toBe("after the edit");
  expect(byId.get("m-2")?.edited).toBe(true);
  expect(byId.get("m-3")?.msgKind).toBe("revoked");
  expect(byId.get("m-3")?.text).toBeUndefined();
  expect(byId.get("m-1")?.who).toEqual({ id: PEER, mode: "pn" });
});

it("row 8 · 9 — stored media carries a ref and its bytes; failed media declares the failure", async () => {
  const { read: found, mirror } = await read();

  const stored = found.lines.find((entry) => entry.line.id === "m-media");
  expect(stored?.line.text).toBe("a caption");
  expect(stored?.line.media).toEqual({ state: "NeverDriven" });
  expect(stored?.ref).toMatch(/^media:v1:[0-9a-f]{64}$/);
  const bytes = await mirror.bytes(stored!.ref!);
  expect(bytes === undefined ? undefined : Uint8Array.from(bytes)).toEqual(MEDIA_BYTES);

  // Never a line with no media, and never one implying the bytes were read.
  const failed = found.lines.find((entry) => entry.line.id === "m-broken");
  expect(failed?.line.media).toEqual({ state: "Failed" });
  expect(failed?.ref).toBeUndefined();

  expect(await mirror.bytes("media:v1:not-a-ref")).toBeUndefined();
  await mirror.close();
});

it("paging terminates across a timestamp collision, skipping and repeating nothing", async () => {
  // Three messages share one second, which is what a history sync actually does
  // and the only reason the page cursor is a composite key.
  const many = Array.from({ length: 60 }, (_, index) =>
    textMessage({
      id: `m-${String(index)}`,
      chatId: PEER,
      text: `line ${String(index)}`,
      timestamp: index < 3 ? AT + 7 : AT + 100 + index,
    }),
  );
  const { read: found, mirror } = await read({ chats: CONVERSATION.chats, messages: many });
  await mirror.close();

  const ids = found.lines.map((entry) => entry.line.id);
  expect(ids).toHaveLength(60);
  expect(new Set(ids).size).toBe(60);
  const times = found.lines.map((entry) => entry.line.at);
  expect([...times].sort((a, b) => a - b)).toEqual(times);
});
