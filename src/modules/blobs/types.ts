/**
 * `blobs` — global content-addressed bytes, stored once by SHA-256.
 *
 * THE interface: bind one home-granted root, then put, get or ask whether a hash exists.
 */

import type { Place } from "~/modules/home/types.ts";

export type BlobHash = string;
export type BlobBytes = Uint8Array | AsyncIterable<Uint8Array>;

export type BlobProblemDetail =
  | { readonly _tag: "BadHash"; readonly hash: string }
  | { readonly _tag: "Missing"; readonly hash: BlobHash }
  | { readonly _tag: "Unreadable"; readonly cause: string }
  | { readonly _tag: "Unwritable"; readonly cause: string };

export type BlobProblem = { readonly problems: readonly BlobProblemDetail[] };

export type PutBlobResult = {
  readonly hash: BlobHash;
  readonly bytes: number;
  /** False when identical bytes were already present. */
  readonly stored: boolean;
};

export type Blobs = {
  put(bytes: BlobBytes): Promise<PutBlobResult | BlobProblem>;
  get(hash: BlobHash): Promise<Uint8Array | BlobProblem>;
  exists(hash: BlobHash): Promise<boolean | BlobProblem>;
};

export type OpenBlobs = (root: Place) => Blobs;
export type DescribeBlobProblem = (problem: BlobProblemDetail) => string;
