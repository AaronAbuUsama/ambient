/**
 * A seeded Live account, with **no credential and no socket**.
 *
 * The seventh slot, and it is earned rather than assumed: four test files need one
 * populated mirror — `channel`'s own two, `ingest`'s and `cli`'s — and the two
 * alternatives were an illegal reach into `internal/` and the same forty lines
 * written four times. `whatsappd/testing` is the same answer one layer down.
 *
 * It fakes the **session** and nothing else. The runtime, the accept path, the
 * projection and the libSQL file are all real, so what a test reads back was
 * produced exactly as production produces it.
 */

import * as fs from "node:fs";
import * as os from "node:os";

import { createTestWhatsAppSession, textMessage } from "whatsappd/testing";
import type { ConversationSyncBatch, InboundMessage, Update } from "whatsappd";
import { openHome } from "~/modules/home/service.ts";
import type { Home } from "~/modules/home/types.ts";
import { runPair } from "./internal/pair.ts";
import type { Account, ChannelProblem, PairReport } from "./types.ts";

/** How long the harness waits before emitting, and how long quiet then takes. */
const SETTLE_MS = 25;
const QUIET_MS = 60;

export const PEER = "person@s.whatsapp.net";
export const ROOM = "room@g.us";
export const AT = 1_700_000_000_000;
export const MEDIA_BYTES = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]);

export type SeedBatch = {
  readonly chats: ConversationSyncBatch["chats"];
  readonly contacts?: ConversationSyncBatch["contacts"];
  readonly messages: readonly InboundMessage[];
  /** Anything the protocol delivers after the batch — a reaction, an edit, a revoke. */
  readonly updates?: readonly Update[];
  /** `false` leaves the sync unfinished, which is what `SyncIncomplete` is for. */
  readonly online?: boolean;
  readonly isLatest?: boolean;
  /** Only worth setting when `online` is false and the run is meant to time out. */
  readonly deadlineMs?: number;
};

/** Media the runtime will consume into its own store, exactly as it does a live one. */
const image = (id: string, at: number, caption?: string): InboundMessage => ({
  id,
  chatId: PEER,
  sender: { id: PEER, mode: "pn" },
  fromMe: false,
  timestamp: at,
  live: false,
  isGroup: false,
  kind: "image",
  media: {
    mimetype: "image/png",
    // `caption` is read as a value by `internal/line.ts` and never for its
    // presence, and the runtime stores it the same way — so it may simply be here.
    caption,
    download: async () => await Promise.resolve(Buffer.from(MEDIA_BYTES)),
  },
});

/** Media WhatsApp will not hand over. The runtime records the failure, not a hole. */
const broken = (id: string, at: number): InboundMessage => ({
  id,
  chatId: PEER,
  sender: { id: PEER, mode: "pn" },
  fromMe: false,
  timestamp: at,
  live: false,
  isGroup: false,
  kind: "image",
  media: {
    mimetype: "image/png",
    download: async () => await Promise.reject(new Error("gone")),
  },
});

/**
 * One conversation carrying everything a Live Transcript has to survive: a plain
 * message, one that is reacted to, one that is edited, one that is revoked, media
 * the Source holds, and media it does not. Plus a group chat, so a Peer list has
 * two rows and two ways of being named.
 *
 * **Five lines land in `PEER` and one in `ROOM`.** Every test that reads this
 * fixture asserts against those numbers, so they are stated once, here.
 */
export const CONVERSATION: SeedBatch = {
  chats: [
    { id: PEER, isGroup: false, lastMessageAt: AT + 40 },
    { id: ROOM, isGroup: true, subject: "The Room", lastMessageAt: AT + 50 },
  ],
  contacts: [{ id: PEER, nativeIds: [PEER], displayName: "Alice" }],
  messages: [
    textMessage({ id: "m-1", chatId: PEER, text: "hello", timestamp: AT + 1 }),
    textMessage({ id: "m-2", chatId: PEER, text: "before the edit", timestamp: AT + 2 }),
    textMessage({ id: "m-3", chatId: PEER, text: "goodbye", timestamp: AT + 3 }),
    // A group message must name its author: the chat is not the sender.
    textMessage({
      id: "m-room",
      chatId: ROOM,
      text: "in the room",
      timestamp: AT + 50,
      isGroup: true,
      sender: "someone@s.whatsapp.net",
    }),
    image("m-media", AT + 4, "a caption"),
    broken("m-broken", AT + 5),
  ],
  updates: [
    {
      kind: "reaction",
      ref: { id: "m-1", chatId: PEER, fromMe: false },
      emoji: "👍",
      by: PEER,
      removed: false,
      at: AT + 30,
    },
    {
      kind: "edit",
      ref: { id: "m-2", chatId: PEER, fromMe: false },
      at: AT + 31,
      message: textMessage({ id: "m-2", chatId: PEER, text: "after the edit", timestamp: AT + 2 }),
    },
    { kind: "revoke", ref: { id: "m-3", chatId: PEER, fromMe: false }, at: AT + 32 },
  ],
};

export type TemporaryHome = {
  readonly account: Account;
  readonly home: Home;
  /** The caller removes this in its own `afterEach`. */
  readonly root: string;
};

/** A converged home with one converged Source in it. */
export const temporaryHome = async (name = "fixture"): Promise<TemporaryHome> => {
  const root = `${fs.mkdtempSync(`${os.tmpdir()}/ambient-live-`)}/home`;
  const home = openHome(root);
  if ("problems" in home) throw new Error("openHome refused the temp directory");
  if ((await home.converge()).length > 0) throw new Error("the temp home did not converge");
  const source = home.source(name);
  if ((await source.converge()).length > 0) throw new Error("the Source did not converge");
  const store = source.store();
  const media = source.media();
  if ("problems" in store || "problems" in media) throw new Error("home refused a Source Place");
  return { account: { name, store, media }, home, root };
};

/**
 * Pair one account against a driven session and return what the run reported.
 *
 * The emission is deferred because `channel` subscribes inside `openSession` and
 * the runtime subscribes after it returns — emitting immediately would reach
 * neither. The connection frame goes **last**, so the quiet window cannot close
 * until every batch has been accepted.
 */
export const seedAccount = async (
  account: Account,
  seed: SeedBatch,
): Promise<PairReport | ChannelProblem> => {
  const driver = createTestWhatsAppSession();
  return await runPair({
    account,
    quietMs: QUIET_MS,
    deadlineMs: seed.deadlineMs ?? 20_000,
    tickMs: 10,
    openSession: () => {
      setTimeout(() => {
        void (async () => {
          await driver.emit({
            type: "conversation_sync",
            batch: {
              context: {
                source: "full",
                isLatest: seed.isLatest ?? true,
                projection: { mode: "upsert" },
              },
              chats: seed.chats,
              contacts: seed.contacts ?? [],
              messages: seed.messages,
            },
          });
          for (const update of seed.updates ?? []) {
            await driver.emit({ type: "update", update });
          }
          if (seed.online !== false) {
            await driver.emit({ type: "connection", status: { phase: "online" } });
          }
        })();
      }, SETTLE_MS);
      return driver.session;
    },
  });
};
