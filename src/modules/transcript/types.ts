/**
 * `transcript` — the one Write path for both Readers.
 *
 * THE interface: Transcript line shapes, append/read results, and every failure.
 * Archive variants omit facts an Archive cannot know; Live account variants carry
 * their own identifiers and edges instead of flattening both Shapes together.
 */

import type { Place } from "~/modules/home/types.ts";

export type ArchiveMessage = {
  readonly from: "archive";
  readonly kind: "message";
  /** The Wall clock exactly as the Archive wrote it. */
  readonly wall: string;
  /** The resolved Instant, as UTC epoch milliseconds. */
  readonly at: number;
  /** The IANA Zone used to resolve `at`. */
  readonly zone: string;
  /** A display label, never an Address. */
  readonly who: { readonly label: string };
  readonly text: string;
  readonly edited?: true;
  readonly deleted?: true;
  readonly media?: ArchiveMedia;
};

export type StoredMedia = { readonly state: "Stored"; readonly hash: string };

export type ArchiveMedia =
  | StoredMedia
  | { readonly state: "NoHandle"; readonly why: "placeholder" | "not-in-archive" };

export type ArchiveEvent = {
  readonly from: "archive";
  readonly kind: "event";
  readonly wall: string;
  readonly at: number;
  readonly zone: string;
  readonly event:
    | "added"
    | "removed"
    | "left"
    | "renamed"
    | "icon"
    | "admin"
    | "number-changed"
    | "other";
  readonly who: { readonly label: string };
  readonly subject?: string;
  readonly raw: string;
};

export type ArchiveLine = ArchiveMessage | ArchiveEvent;

export type LiveMedia =
  | StoredMedia
  | { readonly state: "NoHandle" }
  | { readonly state: "Expired" }
  | { readonly state: "Failed" }
  | { readonly state: "NeverDriven" };

export type LiveWho = {
  readonly id: string;
  readonly mode: "lid" | "pn";
  /** The witnessed LID↔JID join, when WhatsApp supplied both. */
  readonly alt?: string;
  readonly pushName?: string;
};

/**
 * One reaction, as **current state on its message** — never a line of its own.
 *
 * A Live account's mirror holds the live set: a removed reaction is filtered out
 * and a changed emoji replaces in place, so there is no event trail to write and
 * nothing to reconcile on re-read. `subject` is the reactor WhatsApp keyed it by,
 * or `"aggregate"` when it named nobody.
 *
 * **Amends [ADR 004](../../../docs/adr/004-transcript-line-is-a-union-on-provenance.md).**
 * This was a third arm of `TranscriptLine` until 2026-08-18, when the producer
 * that would have written it turned out not to exist.
 */
export type LiveReaction = {
  readonly subject: string;
  readonly emoji: string;
  readonly by?: string;
  readonly at?: number;
};

export type LiveMessage = {
  readonly from: "live";
  readonly kind: "message";
  readonly at: number;
  readonly id: string;
  readonly who: LiveWho;
  readonly text?: string;
  /** The Source's own word for what this message is — `text`, `image`, `revoked`. */
  readonly msgKind: string;
  readonly quoted?: { readonly id: string; readonly from: string };
  readonly mentions?: readonly string[];
  readonly edited?: true;
  readonly viewOnce?: true;
  readonly ephemeral?: true;
  readonly reactions?: readonly LiveReaction[];
  readonly media?: LiveMedia;
};

export type TranscriptLine = ArchiveLine | LiveMessage;

export type TranscriptProblemDetail =
  | { readonly _tag: "Unreadable"; readonly cause: string }
  | { readonly _tag: "Unwritable"; readonly cause: string }
  | { readonly _tag: "MalformedLine"; readonly line: number };

export type TranscriptProblem = { readonly problems: readonly TranscriptProblemDetail[] };

export type TranscriptWrite = {
  readonly written: number;
  readonly skipped: number;
  readonly messages: { readonly written: number; readonly skipped: number };
  readonly lines: readonly TranscriptLine[];
};

export type WriteTranscript = (
  place: Place,
  lines: readonly TranscriptLine[],
) => Promise<TranscriptWrite | TranscriptProblem>;

export type ReadTranscript = (
  place: Place,
) => Promise<readonly TranscriptLine[] | TranscriptProblem>;

export type DescribeTranscriptProblem = (problem: TranscriptProblemDetail) => string;
