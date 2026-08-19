/**
 * `import` — the History Import operation: an Archive becomes a Transcript, Blobs and a
 * Receipt, in that order, exactly once.
 *
 * THE interface. Read this file alone and you know what `import` is. `service.ts`
 * implements it; `internal/` is what only `import` knows.
 *
 * **Why this module exists, and it is a correction.** The operation first lived inside
 * `cli`'s handler, which reached 176 lines against 8, 8, 12 and 14 for its siblings — so
 * `cli` had become the composition owner its own README says it is not. The deletion test
 * was run against a guess (four lines of wiring) rather than the code. Run against the
 * code: deleting this module puts ~100 lines of ordered, failure-prone writes back into a
 * module specified to hold no logic, and gives it four new dependencies.
 *
 * **What it owns that nothing else can.** The *order* of the writes and what a crash
 * between them leaves behind. Blobs, then Transcript, then primary source, then Receipt —
 * see `README.md` for what each gap means.
 *
 * **Every way this module can fail is a value below.** Nothing throws.
 */

import type { Place } from "~/modules/home/types.ts";

/** What one import did. Counts, never content — nothing here is a Message. */
export interface ImportReport {
  /** Transcript lines this run appended. Zero on a re-import, which is the success case. */
  readonly written: number;
  /** Lines already present, so not written again. */
  readonly skipped: number;
  readonly messages: number;
  readonly events: number;
  /** Markers seen, resolved to a Blob, and left unresolved. */
  readonly markers: {
    readonly seen: number;
    readonly resolved: number;
    readonly unresolved: number;
  };
  /** Distinct Blobs the resolved Markers landed on — lower than `resolved` when media repeats. */
  readonly blobs: number;
  /** 1-based source line numbers the parser refused. Non-empty is a finding, never fatal. */
  readonly unreadable: readonly number[];
  /** The Zone used, and whether the caller gave it or it was defaulted. */
  readonly zone: { readonly name: string; readonly given: boolean };
  /** True when this Archive had been imported here before. */
  readonly rerun: boolean;
}

/** How an import can fail. Each is a distinct remedy, so each is its own value. */
export type ImportProblem =
  /** The Archive could not be read. `detail` is the reader's own words. */
  | { readonly _tag: "Unreadable"; readonly detail: string }
  /** A Blob could not be stored. */
  | { readonly _tag: "BlobRefused"; readonly detail: string }
  /** The Transcript could not be appended to. */
  | { readonly _tag: "TranscriptRefused"; readonly detail: string }
  /** The Receipt or the primary source could not be persisted — the import is NOT durable. */
  | { readonly _tag: "ReceiptUnwritable"; readonly cause: string };

export interface ImportFailure {
  readonly problems: readonly ImportProblem[];
}

/**
 * What the caller must supply. `home` grants both places; `import` never builds a path.
 */
export interface ImportRequest {
  /** An absolute path to an Archive — a bare `.txt`, or a `.zip` of either shape. */
  readonly file: string;
  /** Where the Chat's Transcript lives. */
  readonly transcript: Place;
  /** Where this Chat's import Receipts live. */
  readonly imports: Place;
  /** The global Blob store. */
  readonly blobs: Place;
  /** An IANA Zone name — never an offset. */
  readonly zone: string;
  /** False when the caller defaulted the Zone rather than stating it. Recorded, not judged. */
  readonly zoneGiven: boolean;
}

/**
 * Run one import.
 *
 * **Idempotent.** Re-running the same Archive appends nothing and reports `written: 0`
 * with `rerun: true`. The Receipt keeps the numbers from the run that actually wrote the
 * lines, so a re-import never overwrites the provenance of the import.
 */
export type RunImport = (request: ImportRequest) => Promise<ImportReport | ImportFailure>;

/** Rendering lives here, not in `cli`. */
export type DescribeImportProblem = (problem: ImportProblem) => string;

/**
 * The one-line outcome a human reads. `into` is a caller-supplied label for the
 * destination — this module has no idea what a Chat or a slug is, and should not.
 */
export type Summarise = (report: ImportReport, into: string) => string;
