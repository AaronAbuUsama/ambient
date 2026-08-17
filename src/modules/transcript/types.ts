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
};

export type LiveMedia =
  | { readonly state: "Stored"; readonly blob: string }
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

export type LiveMessage = {
  readonly from: "live";
  readonly kind: "message";
  readonly at: number;
  readonly id: string;
  readonly who: LiveWho;
  readonly text?: string;
  readonly msgKind: string;
  readonly quoted?: { readonly id: string; readonly from: string };
  readonly mentions?: readonly string[];
  readonly edited?: true;
  readonly viewOnce?: true;
  readonly ephemeral?: true;
  readonly media?: LiveMedia;
};

export type LiveReaction = {
  readonly from: "live";
  readonly kind: "reaction";
  readonly at: number;
  readonly target: string;
  readonly who: LiveWho;
  /** `null` means the reaction was removed. */
  readonly emoji: string | null;
};

export type TranscriptLine = ArchiveMessage | LiveMessage | LiveReaction;

export type TranscriptProblemDetail =
  | { readonly _tag: "Unreadable"; readonly cause: string }
  | { readonly _tag: "Unwritable"; readonly cause: string }
  | { readonly _tag: "MalformedLine"; readonly line: number };

export type TranscriptProblem = { readonly problems: readonly TranscriptProblemDetail[] };

export type TranscriptWrite = {
  readonly written: number;
  readonly skipped: number;
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
