/**
 * Spending the one-shot.
 *
 * A full history sync is **one-shot per credential** — the request rides the
 * pairing registration node, so reconnecting cannot re-ask. Everything here is
 * shaped by that: Ambient writes nothing at all inside the window, the runtime
 * commits each batch in its own transaction, and the run reports what it saw
 * rather than deciding on our behalf that it saw enough.
 *
 * `openSession` is a parameter and not a constant because it is the module's own
 * test seam: `whatsappd/testing` drives a session that never opens a socket, and
 * the type stays in here so `channel`'s public interface keeps hiding `whatsappd`.
 */

import { createWhatsAppRuntime } from "whatsappd";
import { causeOf } from "~/modules/failure/service.ts";
import type { Awaitable, CredentialStore, RuntimeSession, Status } from "whatsappd";
import { backendFor } from "./mirror.ts";
import type { Account, ChannelProblem, PairProgress, PairReport } from "../types.ts";

export type OpenSession = (credentials: CredentialStore) => Awaitable<RuntimeSession>;

export type RunPair = {
  readonly account: Account;
  readonly quietMs: number;
  readonly deadlineMs: number;
  readonly onProgress?: (progress: PairProgress) => void;
  readonly openSession: OpenSession;
  /** How often the run asks whether it is finished. Small enough to keep a test quick. */
  readonly tickMs?: number;
};

const fail = (problem: ChannelProblem["problems"][number]): ChannelProblem => ({
  problems: [problem],
});

/** `phase: "online"` is the authoritative readiness signal; the rest is narration. */
const progressOf = (status: Status, messages: number, chats: number): PairProgress | undefined => {
  if (status.phase === "pairing") {
    const step = status.pairing;
    if (step.step === "challenge_live") {
      return { step: "challenge", qr: step.qr, expiresAt: step.expiresAt };
    }
    return { step: "waiting" };
  }
  if (status.phase === "authenticated") return { step: "syncing", messages, chats };
  if (status.phase === "online") return { step: "linked" };
  return undefined;
};

export const runPair = async (request: RunPair): Promise<PairReport | ChannelProblem> => {
  const backend = backendFor(request.account);
  const batches: Record<string, number> = {};
  const seenChats = new Set<string>();
  let messages = 0;
  let flagged = false;
  let online = false;
  let loggedOut: string | undefined;
  let lastBatchAt = Date.now();

  const runtime = createWhatsAppRuntime({
    accountId: request.account.name,
    backend,
    openSession: async (credentials) => {
      const session = await request.openSession(credentials);
      session.subscribe({
        connection(status) {
          online = status.phase === "online";
          if (status.phase === "logged_out") loggedOut = status.reason;
          const progress = progressOf(status, messages, seenChats.size);
          if (progress !== undefined) request.onProgress?.(progress);
        },
        // Kept cheap on purpose: this runs on whatsappd's own event pipeline and
        // blocking it stalls the connection state machine. An EMPTY batch is news
        // too — WhatsApp answering with no rows is it saying there is nothing more.
        conversationSync(batch) {
          lastBatchAt = Date.now();
          batches[batch.context.source] = (batches[batch.context.source] ?? 0) + 1;
          if (batch.context.isLatest === true) flagged = true;
          for (const chat of batch.chats) seenChats.add(chat.id);
          messages += batch.messages.length;
          request.onProgress?.({ step: "syncing", messages, chats: seenChats.size });
        },
      });
      return session;
    },
  });

  const started = Date.now();
  const tick = request.tickMs ?? 250;
  try {
    await runtime.start();
  } catch (cause: unknown) {
    await backend.close().catch(() => undefined);
    const said = causeOf(cause);
    return fail(
      said.toLowerCase().includes("claim")
        ? { _tag: "Claimed", cause: said }
        : { _tag: "Unpairable", cause: said },
    );
  }

  let timedOut = false;
  for (;;) {
    // A batch commits only after every attachment in it is fetched, one at a
    // time, so `wa_messages` sits still while media climbs. Quiet has to outlast
    // that or it reads a working download as a finished sync.
    const quiet = online && Date.now() - lastBatchAt >= request.quietMs;
    if (quiet || loggedOut !== undefined) break;
    if (Date.now() - started >= request.deadlineMs) {
      timedOut = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, tick));
  }

  await runtime.stop().catch(() => undefined);
  await backend.close().catch(() => undefined);

  if (loggedOut !== undefined) return fail({ _tag: "Unpairable", cause: loggedOut });
  if (timedOut) {
    return fail({
      _tag: "SyncIncomplete",
      messages,
      chats: seenChats.size,
      after: `${String(Math.round((Date.now() - started) / 1000))}s`,
    });
  }
  request.onProgress?.({ step: "quiet", messages, chats: seenChats.size });
  return { account: request.account.name, batches, messages, chats: seenChats.size, flagged };
};
