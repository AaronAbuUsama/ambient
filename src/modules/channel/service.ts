/**
 * `channel` assembly. The interface is [`types.ts`](./types.ts).
 *
 * This file and `internal/` are the only place in the repository that names
 * `whatsappd`. Nothing above it has heard of `libsqlBackend`, a `MessageRecord`
 * or a media ref's format.
 */

import * as fs from "node:fs";

import { createSession, qrAuth } from "whatsappd";

import { causeOf } from "~/modules/failure/service.ts";
import { lineOf } from "./internal/line.ts";
import { allMessages, backendFor, peerOf } from "./internal/mirror.ts";
import { runPair } from "./internal/pair.ts";
import type {
  ChannelProblem,
  ChannelProblemDetail,
  DescribeChannelProblem,
  DescribePairProgress,
  LiveLine,
  Mirror,
  OpenMirror,
  Pair,
  Peer,
  PeerRead,
  SummarisePair,
} from "./types.ts";

const fail = (problem: ChannelProblemDetail): ChannelProblem => ({ problems: [problem] });

const unreadable = (cause: unknown): ChannelProblem =>
  fail({ _tag: "StoreUnwritable", cause: causeOf(cause) });

export const openMirror: OpenMirror = async (account) => {
  // Before anything else, because `libsqlBackend` creates what it is pointed at.
  if (!fs.existsSync(account.store.path)) {
    return fail({ _tag: "Unpaired", at: account.store.path });
  }
  const backend = backendFor(account);
  const media = { accountId: account.name };

  const mirror: Mirror = {
    // ONE transaction. The chat list and every page counted from it are at one
    // revision, so a writer committing meanwhile cannot be half-visible.
    peers: async (): Promise<readonly Peer[] | ChannelProblem> => {
      try {
        return await backend.data.read(account.name, async (view) => {
          const snapshot = await view.snapshot();
          const peers: Peer[] = [];
          for (const chat of snapshot.chats) {
            const messages = await allMessages(view, chat.chatId);
            peers.push(peerOf(chat, snapshot, messages.length));
          }
          return peers;
        });
      } catch (cause: unknown) {
        return unreadable(cause);
      }
    },

    read: async (peer: string): Promise<PeerRead | ChannelProblem> => {
      try {
        return await backend.data.read(account.name, async (view) => {
          const page = await view.messages(peer, { limit: 1 });
          const records = await allMessages(view, peer);
          const lines: LiveLine[] = records.map(lineOf);
          return { lines, revision: page.revision };
        });
      } catch (cause: unknown) {
        return unreadable(cause);
      }
    },

    // Outside the transaction on purpose: media is files, and a file read cannot
    // tear against a database write. `open` returns null rather than throwing for
    // a malformed ref, a non-file, or bytes that are simply gone.
    bytes: async (ref: string): Promise<Uint8Array | undefined> => {
      const stream = await backend.media.open({ ...media, ref }).catch(() => null);
      if (stream === null) return undefined;
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) chunks.push(chunk);
      return Buffer.concat(chunks);
    },

    close: async (): Promise<void> => {
      await backend.close().catch(() => undefined);
    },
  };
  return mirror;
};

export const pair: Pair = async (request) =>
  await runPair({
    account: request.account,
    quietMs: request.quietMs ?? 20_000,
    deadlineMs: request.deadlineMs ?? 1_800_000,
    onProgress: request.onProgress,
    // The production session, and the ONE place a socket is opened. `syncFullHistory`
    // is the one-shot: it rides the pairing registration node and cannot be re-asked.
    openSession: (credentials) =>
      createSession({ store: credentials, auth: qrAuth(), syncFullHistory: true }),
  });

export const describe: DescribeChannelProblem = (problem) => {
  switch (problem._tag) {
    case "Unpairable":
      return `the account could not be paired: ${problem.cause}`;
    case "Claimed":
      return `another process holds this account: ${problem.cause}`;
    case "StoreUnwritable":
      return `the account store could not be opened — it must be writable: ${problem.cause}`;
    case "Unpaired":
      return `no account store at ${problem.at}; run \`ambient pair\` first`;
    case "SyncIncomplete":
      return `the sync did not finish after ${problem.after}: ${String(problem.messages)} messages across ${String(problem.chats)} chats landed and are durable; re-run \`ambient pair\` to continue`;
  }
};

export const describeProgress: DescribePairProgress = (progress) => {
  switch (progress.step) {
    case "waiting":
      return "connecting";
    case "challenge":
      return progress.qr === undefined ? "waiting for the code" : "scan the code in WhatsApp";
    case "linked":
      return "linked";
    case "syncing":
    case "quiet":
      return `${String(progress.messages)} messages across ${String(progress.chats)} chats`;
  }
};

const plural = (n: number, one: string): string => `${String(n)} ${one}${n === 1 ? "" : "s"}`;

export const summarisePair: SummarisePair = (report, into) => {
  const kinds = Object.entries(report.batches)
    .map(([kind, count]) => `${kind} ${String(count)}`)
    .join(" · ");
  const how = report.flagged
    ? "the sync flagged its last chunk"
    : "no completion flag arrived — re-run `ambient pair` and it will continue from what is there";
  return `Paired ${into}: ${plural(report.messages, "message")} across ${plural(report.chats, "chat")} are durable (${kinds || "no batches"}); ${how}`;
};
