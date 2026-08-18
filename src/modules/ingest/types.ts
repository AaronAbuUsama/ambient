/**
 * `ingest` — the Continuous Ingestion operation: a Live account's mirror becomes
 * Blobs and Transcript lines, in that order, idempotently.
 *
 * THE interface. Read this file alone and you know what `ingest` is. `service.ts`
 * implements it; `internal/` is what only `ingest` knows.
 *
 * It is [`import`](../import/types.ts) with a different Reader. What it owns is the
 * **order of the writes** and what a crash between them leaves — `README.md` says
 * what each gap means. `channel` reads, `blobs` stores, `transcript` appends, and
 * none of the three knows the others exist.
 *
 * **Every way this module can fail is a value below.** Nothing throws.
 */

import type { Account } from "~/modules/channel/types.ts";
import type { Place } from "~/modules/home/types.ts";

/** What one ingest did. Counts, never content — nothing here is a Message. */
export type IngestReport = {
  /** Transcript lines this run appended. Zero on a re-run, which is the success case. */
  readonly written: number;
  /** Lines already present, so not written again. */
  readonly skipped: number;
  /** Lines the mirror holds for this Peer, at one revision. */
  readonly read: number;
  /** The mirror revision every line came from. */
  readonly revision: number;
  /** Media seen, stored as a Blob, and left unresolved because the Source has no bytes. */
  readonly media: {
    readonly seen: number;
    readonly stored: number;
    readonly unresolved: number;
  };
  /** Distinct Blobs the stored media landed on — lower than `stored` when media repeats. */
  readonly blobs: number;
};

/** How an ingest can fail. Each is a distinct remedy, so each is its own value. */
export type IngestProblem =
  /** The durable mirror could not be read. */
  | { readonly _tag: "ChannelRefused"; readonly detail: string }
  /** A Blob could not be stored, so its line is not written either. */
  | { readonly _tag: "BlobRefused"; readonly detail: string }
  /** The Transcript could not be appended to. */
  | { readonly _tag: "TranscriptRefused"; readonly detail: string };

export type IngestFailure = { readonly problems: readonly IngestProblem[] };

/** What the caller must supply. `home` grants every Place; `ingest` never builds a path. */
export type IngestRequest = {
  /** Which Live account to read, and where its durable state lives. */
  readonly account: Account;
  /** The Source's own id for one conversation. */
  readonly peer: string;
  /** Where this Chat's Transcript lives. */
  readonly transcript: Place;
  /** The global Blob store. */
  readonly blobs: Place;
};

/**
 * Run one ingest.
 *
 * **Idempotent.** Re-running appends nothing, reports `written: 0`, and leaves
 * `transcript.jsonl` byte-identical — including every Archive line already in it.
 * There is no Cursor: the mirror is current state, so a second pass reads what is
 * there now and the Transcript's own dedup makes it free.
 */
export type RunIngest = (request: IngestRequest) => Promise<IngestReport | IngestFailure>;

/** Rendering lives here, not in `cli`. */
export type Describe = (problem: IngestProblem) => string;

/**
 * The one-line outcome a human reads. `into` is a caller-supplied label — this
 * module has no idea what a Chat or a slug is, and should not.
 */
export type Summarise = (report: IngestReport, into: string) => string;
