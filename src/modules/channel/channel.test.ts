/**
 * `channel`'s interface against a real libSQL file — pairing, the Peer list, and
 * the two ways a run can fail. **No credential and no socket.**
 *
 * How a `MessageRecord` becomes a Transcript line is [`lines.test.ts`](./lines.test.ts).
 */

import * as fs from "node:fs";
import { afterEach, expect, it } from "vite-plus/test";
import { textMessage } from "whatsappd/testing";

import { describe, openMirror, summarisePair } from "./service.ts";
import { AT, CONVERSATION, PEER, ROOM, seedAccount, temporaryHome } from "./testing.ts";
import type { TemporaryHome } from "./testing.ts";

const made: string[] = [];
afterEach(() => {
  for (const root of made.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const opened = async (): Promise<TemporaryHome> => {
  const fixture = await temporaryHome();
  made.push(fixture.root);
  return fixture;
};

it("row 1 — pairing writes the store and the media tree under the granted Places, and nowhere else", async () => {
  const { account } = await opened();
  const report = await seedAccount(account, CONVERSATION);
  if ("problems" in report) throw new Error(JSON.stringify(report.problems));

  expect(report.account).toBe("fixture");
  expect(report.batches).toEqual({ full: 1 });
  expect(report.messages).toBe(6);
  expect(report.chats).toBe(2);
  expect(report.flagged).toBe(true);
  expect(summarisePair(report, "fixture")).toContain("6 messages across 2 chats are durable");

  // Everything written sits under the one Source directory `home` granted.
  const dir = account.store.path.slice(0, account.store.path.lastIndexOf("/"));
  expect(fs.readdirSync(dir).sort()).toEqual([
    "media",
    "whatsapp.db",
    "whatsapp.db-shm",
    "whatsapp.db-wal",
  ]);
});

it("row 3 — an unpaired Source refuses and names the file, rather than creating one", async () => {
  const { account } = await opened();
  const refused = await openMirror(account);
  if (!("problems" in refused)) throw new Error("an unpaired account was opened");
  expect(refused.problems[0]?._tag).toBe("Unpaired");
  expect(describe(refused.problems[0]!)).toContain("run `ambient pair` first");
  // The check exists precisely so this stays false.
  expect(fs.existsSync(account.store.path)).toBe(false);
});

it("row 2 · 15 — peers reads with no socket, no lease and no runtime, and writes nothing", async () => {
  const { account } = await opened();
  expect("problems" in (await seedAccount(account, CONVERSATION))).toBe(false);

  const before = fs.statSync(account.store.path).mtimeMs;
  const mirror = await openMirror(account);
  if ("problems" in mirror) throw new Error(JSON.stringify(mirror.problems));
  const peers = await mirror.peers();
  await mirror.close();
  if ("problems" in peers) throw new Error(JSON.stringify(peers.problems));

  expect(peers).toEqual(
    expect.arrayContaining([
      { id: ROOM, subject: "The Room", isGroup: true, messages: 1, newest: AT + 50 },
      // `newest` is the chat's own `lastMessageAt`, not the newest message we hold —
      // WhatsApp knows about messages this device was never sent.
      { id: PEER, subject: "Alice", isGroup: false, messages: 5, newest: AT + 40 },
    ]),
  );
  expect(fs.statSync(account.store.path).mtimeMs).toBe(before);
});

it("a run that never goes quiet is SyncIncomplete, and says how far it got", async () => {
  const { account } = await opened();
  // No connection frame, so `online` is never true and quiet can never close.
  const result = await seedAccount(account, {
    chats: CONVERSATION.chats,
    messages: [textMessage({ id: "m-1", chatId: PEER, text: "one", timestamp: AT })],
    online: false,
    deadlineMs: 300,
  });
  if (!("problems" in result)) throw new Error("an unfinished sync reported success");
  const problem = result.problems[0];
  expect(problem?._tag).toBe("SyncIncomplete");
  expect(describe(problem!)).toContain("landed and are durable");
  expect(describe(problem!)).toContain("re-run `ambient pair`");
});
