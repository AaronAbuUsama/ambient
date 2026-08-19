/**
 * The Transcript line format, declared once — [ADR 006](../../../../docs/adr/006-schema-is-the-parse-boundary.md) step 3.
 *
 * This file used to be the decode half of a two-way translation nobody had
 * written as one: it narrowed `unknown` a key at a time, `internal/store.ts`
 * encoded with `JSON.stringify`, and `service.ts` compared two results with a
 * hand-written key sorter because the two could disagree about shape. One
 * declaration now serves all three.
 *
 * **Key order is the format.** 14,045 lines are already on disk and the order
 * below is the order they were written in — `archive/internal/classify.ts` for
 * the two Archive shapes, `channel/internal/line.ts` for the Live one.
 * `LiveMessage` is the one place this is not `types.ts`'s order: the producer
 * writes `msgKind` before `text` and the file has it that way, so the
 * declaration follows the disk and not the type. ADR 006 falsifier 2 is exactly
 * this, and the roundtrip gate in `transcript.test.ts` is what holds it.
 *
 * **`optionalKey`, never `optional`.** An absent optional must stay an absent
 * key, because a key that is present and `undefined` is the shape difference
 * that rewrote 638 of 1,000 lines — D1, `service.ts:36-43`.
 */

import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

import type { TranscriptLine } from "../types.ts";

const StoredMedia = Schema.Struct({
  state: Schema.Literal("Stored"),
  hash: Schema.String,
});

const ArchiveMedia = Schema.Union([
  StoredMedia,
  Schema.Struct({
    state: Schema.Literal("NoHandle"),
    why: Schema.Literals(["placeholder", "not-in-archive"]),
  }),
]);

const LiveMedia = Schema.Union([
  StoredMedia,
  Schema.Struct({ state: Schema.Literal("NoHandle") }),
  Schema.Struct({ state: Schema.Literal("Expired") }),
  Schema.Struct({ state: Schema.Literal("Failed") }),
  Schema.Struct({ state: Schema.Literal("NeverDriven") }),
]);

const ArchiveWho = Schema.Struct({ label: Schema.String });

const LiveWho = Schema.Struct({
  id: Schema.String,
  mode: Schema.Literals(["lid", "pn"]),
  alt: Schema.optionalKey(Schema.String),
  pushName: Schema.optionalKey(Schema.String),
});

const LiveReaction = Schema.Struct({
  subject: Schema.String,
  emoji: Schema.String,
  by: Schema.optionalKey(Schema.String),
  at: Schema.optionalKey(Schema.Number),
});

/** `classify.ts`'s order. */
const ArchiveMessageLine = Schema.Struct({
  from: Schema.Literal("archive"),
  kind: Schema.Literal("message"),
  wall: Schema.String,
  at: Schema.Number,
  zone: Schema.String,
  who: ArchiveWho,
  text: Schema.String,
  edited: Schema.optionalKey(Schema.Literal(true)),
  deleted: Schema.optionalKey(Schema.Literal(true)),
  media: Schema.optionalKey(ArchiveMedia),
});

/** `classify.ts`'s order. */
const ArchiveEventLine = Schema.Struct({
  from: Schema.Literal("archive"),
  kind: Schema.Literal("event"),
  wall: Schema.String,
  at: Schema.Number,
  zone: Schema.String,
  event: Schema.Literals([
    "added",
    "removed",
    "left",
    "renamed",
    "icon",
    "admin",
    "number-changed",
    "other",
  ]),
  who: ArchiveWho,
  subject: Schema.optionalKey(Schema.String),
  raw: Schema.String,
});

/** `channel/internal/line.ts`'s order — `msgKind` before `text`, as the file has it. */
const LiveMessageLine = Schema.Struct({
  from: Schema.Literal("live"),
  kind: Schema.Literal("message"),
  at: Schema.Number,
  id: Schema.String,
  who: LiveWho,
  msgKind: Schema.String,
  text: Schema.optionalKey(Schema.String),
  quoted: Schema.optionalKey(Schema.Struct({ id: Schema.String, from: Schema.String })),
  mentions: Schema.optionalKey(Schema.Array(Schema.String)),
  edited: Schema.optionalKey(Schema.Literal(true)),
  viewOnce: Schema.optionalKey(Schema.Literal(true)),
  ephemeral: Schema.optionalKey(Schema.Literal(true)),
  reactions: Schema.optionalKey(Schema.Array(LiveReaction)),
  media: Schema.optionalKey(LiveMedia),
});

const Line = Schema.Union([ArchiveMessageLine, ArchiveEventLine, LiveMessageLine]);

/**
 * Fail-closed: an unknown key refuses the line rather than dropping it silently,
 * which is what stops a re-import from discarding a field a later reader adds.
 */
const decodeLine = Schema.decodeUnknownResult(Line, { onExcessProperty: "error" });
const encodeLine = Schema.encodeResult(Line);

/**
 * One row of the file to one Transcript line, or nothing.
 *
 * It takes the text rather than a parsed value so that `unknown` never crosses a
 * signature: JSON that will not parse and JSON that is not a line are the same
 * answer to the caller, which reports `MalformedLine` with a line number and
 * never a reason. What a person needs in order to fix a torn Transcript is which
 * line, not which key.
 */
export const lineOf = (row: string): TranscriptLine | undefined => {
  let value: unknown;
  try {
    value = JSON.parse(row);
  } catch {
    return undefined;
  }
  const decoded = decodeLine(value);
  return Result.isFailure(decoded) ? undefined : decoded.success;
};

/**
 * One Transcript line to its canonical bytes.
 *
 * Canonical is the point. Two producers of the same line encode to the same
 * string, so comparing two lines is comparing two strings — which is what lets
 * `service.ts` drop the key sorter it needed when they could disagree.
 */
export const bytesOf = (line: TranscriptLine): string => {
  const encoded = encodeLine(line);
  // SAFETY: `line` is a `TranscriptLine`, so it satisfies the same union that
  // decoded it and encoding cannot fail. The `JSON.stringify` arm is a value and
  // not an exception, per errors.md: a line that somehow did not encode is still
  // written rather than lost, and the roundtrip gate proves the two agree.
  return Result.isFailure(encoded) ? JSON.stringify(line) : JSON.stringify(encoded.success);
};
