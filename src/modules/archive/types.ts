/**
 * `archive` — an Archive string to Message values. No filesystem, home, or network.
 *
 * THE interface: what a read yields and every way it can fail.
 */

import type { ArchiveMessage } from "~/modules/transcript/types.ts";

export type UnparsedLine = {
  /** 1-based line number in the Archive's `_chat.txt`. */
  readonly line: number;
  readonly reason: "no-message" | "malformed-wall-clock";
};

export type ArchiveRead = {
  readonly messages: readonly ArchiveMessage[];
  readonly continuations: number;
  readonly unparsed: readonly UnparsedLine[];
  readonly span: { readonly oldest: number; readonly newest: number } | undefined;
};

export type ArchiveProblemDetail =
  | { readonly _tag: "NotAnArchive" }
  | { readonly _tag: "AmbiguousDateOrder" }
  | { readonly _tag: "InvalidZone"; readonly zone: string };

export type ArchiveProblem = { readonly problems: readonly ArchiveProblemDetail[] };

/** `text` is the complete `_chat.txt`; `zone` is an IANA Zone name. */
export type ReadArchive = (text: string, zone: string) => ArchiveRead | ArchiveProblem;

export type DescribeArchiveProblem = (problem: ArchiveProblemDetail) => string;
