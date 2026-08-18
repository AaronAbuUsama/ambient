/**
 * `channel` — a Live account Reader, and the one module that knows `whatsappd`.
 *
 * THE interface. Read this file alone and you know what `channel` is. `service.ts`
 * implements it; `internal/` is what only `channel` knows.
 *
 * **It reads and it produces values. It writes no Ambient state** — no Blob, no
 * Transcript line, no Cursor. That is the same rule `archive` follows, and it is
 * what stops this module becoming the composition owner: the operation that owns
 * the *order* of Ambient's writes is [`ingest`](../ingest/types.ts).
 *
 * The one exception is `pair`, which is not an Ambient write: it hands the account
 * to `whatsappd`'s own durable runtime and watches. **Ambient writes nothing at all
 * inside the sync window** — that is the entire argument of ADR 005. A one-shot full
 * sync cannot be re-requested, so our mapper, our Blob store and every bug in them
 * sit *behind* a durable boundary where a crash costs a re-read.
 *
 * **Every way this module can fail is a value below.** Nothing throws.
 */

import type { Place } from "~/modules/home/types.ts";
import type { LiveMessage } from "~/modules/transcript/types.ts";

/**
 * Where one Source's durable state lives. `home` grants both Places and `channel`
 * never builds a path.
 *
 * `media` must be the **same** directory `whatsappd` wrote, and `name` the same
 * account id, because both are inputs to a media ref's path and neither is
 * recoverable from the ref itself.
 */
export type Account = {
  readonly name: string;
  /**
   * The libSQL file. **Must be writable** — `PRAGMA journal_mode = WAL` runs before
   * anything is read, so a read-only copy fails before the first `SELECT`.
   */
  readonly store: Place;
  /** `whatsappd`'s own media tree, keyed by its refs and not by our hashes. */
  readonly media: Place;
};

/** One conversation the account holds. A **Peer** is the Source's own id for it. */
export type Peer = {
  readonly id: string;
  /** A group's subject, a contact's resolved name, or the id when neither is known. */
  readonly subject: string;
  readonly isGroup: boolean;
  readonly messages: number;
  /** Newest message Instant as UTC epoch ms; `0` when the conversation is empty. */
  readonly newest: number;
};

/**
 * One Transcript line, plus the Source's own handle on its bytes.
 *
 * The handle is a `ref` and never bytes: `ingest` streams them into `blobs` itself,
 * so `channel` never touches Ambient's Blob store and `blobs` never learns what a
 * WhatsApp account is.
 */
export type LiveLine = {
  readonly line: LiveMessage;
  /** Present only when the mirror actually holds bytes for this line. */
  readonly ref?: string;
};

export type PeerRead = {
  readonly lines: readonly LiveLine[];
  /**
   * The mirror revision every line here was read at. One transaction, one number —
   * a writer committing mid-read cannot be half-visible.
   */
  readonly revision: number;
};

/** How reading or pairing can fail. Each is a distinct remedy, so each is its own value. */
export type ChannelProblemDetail =
  /** The credential was refused, or the QR expired without anyone scanning it. */
  | { readonly _tag: "Unpairable"; readonly cause: string }
  /** Another writer holds this account's lease. Reading never needs one. */
  | { readonly _tag: "Claimed"; readonly cause: string }
  /** The libSQL file could not be opened, migrated, or written to. */
  | { readonly _tag: "StoreUnwritable"; readonly cause: string }
  /**
   * There is no store, so this account has never been paired.
   *
   * Its own value because its remedy is its own: `libsqlBackend` **creates** the
   * file it is pointed at, so without this check reading an unpaired account
   * succeeds, reports zero conversations, and leaves an empty database behind
   * that looks exactly like a paired account with nothing in it.
   */
  | { readonly _tag: "Unpaired"; readonly at: string }
  /**
   * The dangerous one. The run ended before the protocol went quiet, so history
   * that was requested may not have landed — and a full sync is one-shot per
   * credential. The counts say exactly how far it got.
   */
  | {
      readonly _tag: "SyncIncomplete";
      readonly messages: number;
      readonly chats: number;
      readonly after: string;
    };

export type ChannelProblem = { readonly problems: readonly ChannelProblemDetail[] };

/**
 * One account's mirror, open. Each read runs in **one** transaction, so a page
 * and the snapshot it came from can never disagree.
 *
 * `bytes` is deliberately outside that guarantee: media lives in files, not in the
 * database, and reading it cannot tear.
 *
 * **Close it.** The libSQL client holds a connection until you do.
 */
export type Mirror = {
  peers(): Promise<readonly Peer[] | ChannelProblem>;
  /** One Peer, paged to exhaustion, oldest line first. */
  read(peer: string): Promise<PeerRead | ChannelProblem>;
  /** `undefined` when the ref names nothing — a malformed ref, or bytes since removed. */
  bytes(ref: string): Promise<Uint8Array | undefined>;
  close(): Promise<void>;
};

/**
 * Open one account's mirror. **No socket, no lease, no runtime** — measured at 88 ms
 * for a whole account from a second process while a writer held the lease, and the
 * reader could not have stolen it.
 */
export type OpenMirror = (account: Account) => Promise<Mirror | ChannelProblem>;

/** What a pairing run is doing, as a value. `cli` decides how to say it. */
export type PairProgress =
  | { readonly step: "waiting" }
  /** Scan it. `qr` is the payload, not a rendering of it. */
  | { readonly step: "challenge"; readonly qr?: string; readonly expiresAt: number }
  | { readonly step: "linked" }
  | { readonly step: "syncing"; readonly messages: number; readonly chats: number }
  | { readonly step: "quiet"; readonly messages: number; readonly chats: number };

/** What one pairing run landed. Counts, never content. */
export type PairReport = {
  readonly account: string;
  /** One count per kind of history WhatsApp sent — `full`, `recent`, `initial_bootstrap`. */
  readonly batches: Readonly<Record<string, number>>;
  readonly messages: number;
  readonly chats: number;
  /** True when the protocol itself flagged the last chunk, rather than us going quiet. */
  readonly flagged: boolean;
};

export type PairRequest = {
  readonly account: Account;
  /**
   * Stop once the socket is up and no batch has arrived for this long.
   *
   * A sync commits a batch only after every attachment in it is fetched one at a
   * time, so `wa_messages` sits still while media climbs — a short window reads
   * that as done. @defaultValue `20_000`
   */
  readonly quietMs?: number;
  /**
   * A ceiling on the whole run. Reaching it is **`SyncIncomplete`, never a success**:
   * an early exit here cannot be retried. @defaultValue `1_800_000`
   */
  readonly deadlineMs?: number;
  readonly onProgress?: (progress: PairProgress) => void;
};

/**
 * Spend the one-shot. Claims the account lease **before** opening WhatsApp, so a
 * second pairing of the same account fails as `Claimed` rather than racing.
 */
export type Pair = (request: PairRequest) => Promise<PairReport | ChannelProblem>;

/** Rendering lives here, not in `cli`. */
export type DescribeChannelProblem = (problem: ChannelProblemDetail) => string;
export type DescribePairProgress = (progress: PairProgress) => string;

/** `into` is a caller-supplied label. This module has no idea what a Source is named. */
export type SummarisePair = (report: PairReport, into: string) => string;
