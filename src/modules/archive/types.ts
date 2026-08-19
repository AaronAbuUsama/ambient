/**
 * `archive` — Archive text or ZIP to Transcript values. No home or network.
 *
 * THE interface: what a read yields and every way it can fail.
 */

import type { ArchiveLine } from "~/modules/transcript/types.ts";
import type { Describe } from "~/modules/failure/types.ts";

export type UnparsedLine = {
  /** 1-based line number in the Archive's `_chat.txt`. */
  readonly line: number;
  readonly reason: "no-message" | "malformed-wall-clock";
};

export type ArchiveRead = {
  readonly lines: readonly ArchiveLine[];
  readonly markers: readonly { readonly line: number; readonly name: string }[];
  readonly continuations: number;
  readonly unparsed: readonly UnparsedLine[];
  readonly span: { readonly oldest: number; readonly newest: number } | undefined;
  readonly counts: {
    readonly messages: number;
    readonly events: number;
    readonly placeholders: number;
    readonly edits: number;
    readonly deletions: number;
    readonly markers: number;
    readonly resolved: number;
    readonly unresolved: number;
  };
};

export type ArchiveProblemDetail =
  | { readonly _tag: "NotAnArchive" }
  | { readonly _tag: "AmbiguousDateOrder" }
  | { readonly _tag: "InvalidZone"; readonly zone: string }
  | { readonly _tag: "Unreadable"; readonly cause: string }
  | { readonly _tag: "InvalidZip"; readonly cause: string }
  | { readonly _tag: "InvalidFilename" }
  | { readonly _tag: "InvalidText" }
  | { readonly _tag: "UnsafeEntry"; readonly name: string }
  | { readonly _tag: "MissingChatText" };

export type ArchiveProblem = { readonly problems: readonly ArchiveProblemDetail[] };

/** `text` is the complete `_chat.txt`; `zone` is an IANA Zone name. */
export type ReadArchive = (text: string, zone: string) => ArchiveRead | ArchiveProblem;

export type ArchiveMediaEntry = {
  readonly name: string;
  readonly bytes: number;
  readonly open: () => Promise<AsyncIterable<Uint8Array> | ArchiveProblem>;
};

export type OpenedArchive = {
  readonly form: "text" | "zip-text" | "zip-media";
  readonly sha256: string;
  readonly bytes: number;
  readonly readerVersion: 2;
  /** The Archive's own chat text, byte-for-byte. */
  readonly primary: Uint8Array;
  readonly read: ArchiveRead;
  readonly media: readonly ArchiveMediaEntry[];
  readonly close: () => void;
};

export type OpenArchive = (path: string, zone: string) => Promise<OpenedArchive | ArchiveProblem>;

export type ResolveMedia = (read: ArchiveRead, hashes: ReadonlyMap<string, string>) => ArchiveRead;

export type DescribeArchiveProblem = Describe<ArchiveProblemDetail>;
