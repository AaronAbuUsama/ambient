/** `transcript` through its interface, against a real temp directory. */

import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { openHome } from "~/modules/home/service.ts";
import type { Place } from "~/modules/home/types.ts";
import { readTranscript, writeTranscript } from "./service.ts";
import type {
  ArchiveEvent,
  ArchiveLine,
  ArchiveMessage,
  LiveMedia,
  LiveMessage,
  TranscriptWrite,
} from "./types.ts";

const made: string[] = [];

const place = async (): Promise<Place> => {
  const root = `${fs.mkdtempSync(`${os.tmpdir()}/ambient-transcript-`)}/home`;
  made.push(root);
  const home = openHome(root);
  if ("problems" in home) throw new Error("openHome refused the temp directory");
  expect(await home.converge()).toEqual([]);
  expect(await home.chat("fixture").converge()).toEqual([]);
  const transcript = home.chat("fixture").transcript();
  if ("problems" in transcript) throw new Error("home refused the Transcript Place");
  return transcript;
};

afterEach(() => {
  for (const root of made.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const message = (
  text: string,
  wall = "14/02/2025, 4:06:10 PM",
  zone = "Africa/Accra",
): ArchiveMessage => ({
  from: "archive",
  kind: "message",
  wall,
  at: Date.parse("2025-02-14T16:06:10Z"),
  zone,
  who: { label: "Rex" },
  text,
});

const wrote = (result: Awaited<ReturnType<typeof writeTranscript>>): TranscriptWrite => {
  if ("problems" in result) throw new Error("writeTranscript failed");
  return result;
};

it("appends, reads, and leaves an identical re-import byte-identical", async () => {
  const transcript = await place();
  expect(wrote(await writeTranscript(transcript, [message("one")]))).toMatchObject({
    written: 1,
    skipped: 0,
  });
  const before = fs.readFileSync(transcript.path);
  expect(wrote(await writeTranscript(transcript, [message("one")]))).toMatchObject({
    written: 0,
    skipped: 1,
  });
  expect(fs.readFileSync(transcript.path)).toEqual(before);
  expect(await readTranscript(transcript)).toEqual([message("one")]);
});

it("a newer Archive appends only its new Message", async () => {
  const transcript = await place();
  await writeTranscript(transcript, [message("one")]);
  const result = wrote(
    await writeTranscript(transcript, [message("one"), message("two", "14/02/2025, 4:07:00 PM")]),
  );
  expect(result).toMatchObject({ written: 1, skipped: 1 });
  expect(result.lines.map((line) => line.kind === "message" && line.text)).toEqual(["one", "two"]);
});

it("deduplicates by Wall clock while preserving equal-key multiplicity", async () => {
  const transcript = await place();
  const first = message("same");
  expect(wrote(await writeTranscript(transcript, [first, first]))).toMatchObject({ written: 2 });

  const rezoned = { ...first, at: first.at - 18_000_000, zone: "America/New_York" };
  const result = wrote(await writeTranscript(transcript, [rezoned, rezoned]));
  expect(result).toMatchObject({ written: 0, skipped: 2 });
  expect(result.lines).toHaveLength(2);
  expect(
    result.lines.every((line) => line.from !== "archive" || line.zone === "America/New_York"),
  ).toBe(true);
});

it("keeps Stored media when a poorer Archive is imported or rezoned later", async () => {
  const transcript = await place();
  const stored: ArchiveMessage = {
    ...message("caption"),
    media: { state: "Stored", hash: "a".repeat(64) },
  };
  await writeTranscript(transcript, [stored]);

  const poorer: ArchiveMessage = {
    ...message("caption", stored.wall, "America/New_York"),
    at: stored.at + 18_000_000,
    media: { state: "NoHandle", why: "placeholder" },
  };
  const result = wrote(await writeTranscript(transcript, [poorer]));
  expect(result).toMatchObject({ written: 0, skipped: 1 });
  expect(result.lines).toEqual([{ ...poorer, media: stored.media }]);

  const withoutMedia = { ...poorer, media: undefined };
  expect(wrote(await writeTranscript(transcript, [withoutMedia])).lines).toEqual([
    { ...withoutMedia, media: stored.media },
  ]);
});

it("ignores and replaces a torn trailing line", async () => {
  const transcript = await place();
  await writeTranscript(transcript, [message("one")]);
  fs.appendFileSync(transcript.path, '{"from":"archive"');
  expect(await readTranscript(transcript)).toEqual([message("one")]);
  expect(
    wrote(
      await writeTranscript(transcript, [message("one"), message("two", "15/02/2025, 4:06:10 PM")]),
    ),
  ).toMatchObject({ written: 1, skipped: 1 });
  expect(fs.readFileSync(transcript.path, "utf8")).not.toContain('{"from":"archive"{"from"');
});

it("round-trips Archive event, media, edit and deletion variants", async () => {
  const transcript = await place();
  const event: ArchiveEvent = {
    from: "archive",
    kind: "event",
    wall: "14/02/2025, 4:05:10 PM",
    at: Date.parse("2025-02-14T16:05:10Z"),
    zone: "Africa/Accra",
    event: "added",
    who: { label: "Rex" },
    raw: "Rex added Sam",
  };
  const annotated: ArchiveMessage = {
    ...message("caption"),
    edited: true,
    deleted: true,
    media: { state: "NoHandle", why: "placeholder" },
  };
  const result = wrote(await writeTranscript(transcript, [event, annotated]));
  expect(result.lines).toEqual([event, annotated]);
  expect(result.messages).toEqual({ written: 1, skipped: 0 });
  expect(await readTranscript(transcript)).toEqual([event, annotated]);
});

// ── Gate rows 11–13 ───────────────────────────────────────────────────
//
// Three defects in shipped code. All are Live-only and none has ever fired,
// because nothing in this repository had ever produced a Live line.

/**
 * `text` sits before `msgKind` here. That is a producer's key order, and it is
 * not the reader's — `internal/store.ts` rebuilds a loaded line as `from, kind,
 * at, id, who, msgKind, text`. Row 11 is about exactly that difference.
 */
const live = (id: string, media?: LiveMedia): LiveMessage => ({
  from: "live",
  kind: "message",
  at: Date.parse("2026-08-18T09:00:00Z"),
  id,
  who: { id: "1@lid", mode: "lid" },
  text: "hello",
  msgKind: "conversation",
  ...(media === undefined ? {} : { media }),
});

const ids = (lines: readonly import("./types.ts").TranscriptLine[]): readonly string[] =>
  lines.flatMap((line) => (line.from === "live" && line.kind === "message" ? [line.id] : []));

it("row 11 — the same Live ingest twice appends nothing and does not rewrite the file", async () => {
  const transcript = await place();
  expect(wrote(await writeTranscript(transcript, [live("A"), live("B")]))).toMatchObject({
    written: 2,
  });
  const before = fs.readFileSync(transcript.path);
  const inode = fs.statSync(transcript.path).ino;

  expect(wrote(await writeTranscript(transcript, [live("A"), live("B")]))).toMatchObject({
    written: 0,
    skipped: 2,
  });
  expect(fs.readFileSync(transcript.path)).toEqual(before);
  // D1 — change detection is `JSON.stringify(stored) !== JSON.stringify(next)`,
  // which compares a rebuilt object against the caller's. Key order alone sets
  // `changed`, so every replay renames a whole new file over this one.
  expect(fs.statSync(transcript.path).ino).toBe(inode);
});

it("row 12 — a Live re-delivery upgrades media and never degrades a Stored hash", async () => {
  const transcript = await place();
  const hash = "b".repeat(64);
  await writeTranscript(transcript, [live("A", { state: "Failed" })]);

  const upgraded = wrote(await writeTranscript(transcript, [live("A", { state: "Stored", hash })]));
  expect(upgraded).toMatchObject({ written: 0, skipped: 1 });
  expect(upgraded.lines).toEqual([live("A", { state: "Stored", hash })]);

  // D2 — `merged` requires `from === "archive"` on both sides, so for a Live line
  // it returns `incoming` unconditionally. A re-delivery whose bytes were never
  // fetched overwrites the stored hash, and the call reports `written: 0`.
  const again = wrote(await writeTranscript(transcript, [live("A", { state: "Failed" })]));
  expect(again.lines).toEqual([live("A", { state: "Stored", hash })]);
  expect(await readTranscript(transcript)).toEqual([live("A", { state: "Stored", hash })]);
});

it("row 13 — two writers never both succeed with one set lost", async () => {
  const transcript = await place();
  await writeTranscript(transcript, [live("seed", { state: "Failed" })]);

  // Both upgrade the seed, so both take the rewrite path, and both `load()`
  // before either writes.
  const [first, second] = await Promise.all([
    writeTranscript(transcript, [
      live("seed", { state: "Stored", hash: "c".repeat(64) }),
      live("A"),
    ]),
    writeTranscript(transcript, [
      live("seed", { state: "Stored", hash: "d".repeat(64) }),
      live("B"),
    ]),
  ]);

  const after = await readTranscript(transcript);
  if ("problems" in after) throw new Error("readTranscript failed");

  // D6 — `load()` … `replace()` is a read-modify-write with no lock, so the loser's
  // lines vanish while both callers are told they succeeded.
  if (!("problems" in first) && !("problems" in second)) {
    expect(ids(after)).toContain("A");
    expect(ids(after)).toContain("B");
  } else {
    expect([first, second].filter((result) => "problems" in result)).toHaveLength(1);
  }
});

// ── the roundtrip gate ────────────────────────────────────────────────
//
// The `toEqual`s above cannot see this class of change: `toEqual` treats
// `{ text: undefined }` and `{}` as identical. Key PRESENCE is what differed in
// D1, where a shape difference alone rewrote 638 of 1,000 lines — `service.ts:36-43`.
// Every assertion below is `toStrictEqual`, or bytes.

const RT_AT = Date.parse("2026-08-18T09:00:00Z");

/** Every required key of a `LiveMessage`, and not one optional. */
const bare = (): LiveMessage => ({
  from: "live",
  kind: "message",
  at: RT_AT,
  id: "R",
  who: { id: "1@lid", mode: "lid" },
  msgKind: "conversation",
});

/** One case per optional on `LiveMessage` — `types.ts:92-106`. */
const OPTIONALS = [
  ["text", { text: "hello" }],
  ["quoted", { quoted: { id: "Q", from: "1@lid" } }],
  ["mentions", { mentions: ["2@lid"] }],
  ["edited", { edited: true }],
  ["viewOnce", { viewOnce: true }],
  ["ephemeral", { ephemeral: true }],
  ["reactions", { reactions: [{ subject: "2@lid", emoji: "🔥" }] }],
  ["media", { media: { state: "Stored", hash: "a".repeat(64) } }],
] as const satisfies readonly (readonly [string, Partial<LiveMessage>])[];

for (const [name, extra] of OPTIONALS) {
  it(`roundtrip — \`${name}\` present survives the file, key for key`, async () => {
    const transcript = await place();
    const line: LiveMessage = { ...bare(), ...extra };
    expect(wrote(await writeTranscript(transcript, [line])).lines).toStrictEqual([line]);
    expect(await readTranscript(transcript)).toStrictEqual([line]);
  });

  it(`roundtrip — \`${name}\` absent leaves no key behind`, async () => {
    const transcript = await place();
    const line = bare();
    await writeTranscript(transcript, [line]);
    const back = await readTranscript(transcript);
    if ("problems" in back) throw new Error("readTranscript refused the bare line");
    expect(name in back[0]).toBe(false);
    expect(back).toStrictEqual([line]);
  });
}

it("roundtrip — the bare line writes exactly its six keys, and a re-write is a no-op", async () => {
  const transcript = await place();
  const line = bare();
  expect(wrote(await writeTranscript(transcript, [line]))).toMatchObject({ written: 1 });

  // The bytes, exactly. An `undefined`-valued optional would appear here as a key.
  expect(fs.readFileSync(transcript.path, "utf8")).toBe(
    `{"from":"live","kind":"message","at":${RT_AT},"id":"R",` +
      `"who":{"id":"1@lid","mode":"lid"},"msgKind":"conversation"}\n`,
  );

  const before = fs.readFileSync(transcript.path);
  const inode = fs.statSync(transcript.path).ino;
  expect(wrote(await writeTranscript(transcript, [line]))).toMatchObject({
    written: 0,
    skipped: 1,
  });
  expect(fs.readFileSync(transcript.path)).toEqual(before);
  // `same()` at `service.ts:44` — a rewrite renames a whole new file over this one.
  expect(fs.statSync(transcript.path).ino).toBe(inode);
});

/**
 * `encoded(parse(encoded(x))) === encoded(x)`.
 *
 * Stated through the public interface rather than over `internal/`, so it still
 * means this when a codec replaces either side. ADR 006 falsifier 2 is
 * "`optionalKey` does not encode to the bytes already on disk"; this is the
 * property that answers it, and 14,045 lines already depend on the answer.
 */
it("roundtrip — the reader's form is a fixed point of encode-decode, for every optional", async () => {
  for (const [, extra] of OPTIONALS) {
    const line: LiveMessage = { ...bare(), ...extra };
    const first = await place();
    await writeTranscript(first, [line]);
    const back = await readTranscript(first);
    if ("problems" in back) throw new Error("readTranscript refused a written line");
    expect(back).toStrictEqual([line]);

    const second = await place();
    await writeTranscript(second, back);
    const once = fs.readFileSync(second.path, "utf8");
    const again = await readTranscript(second);
    if ("problems" in again) throw new Error("readTranscript refused a re-written line");

    const third = await place();
    await writeTranscript(third, again);
    expect(fs.readFileSync(third.path, "utf8")).toBe(once);
  }
});

// ── the roundtrip gate, Archive side ──────────────────────────────────
//
// `internal/classify.ts` builds an `ArchiveMessage` and is a fourth producer of
// this format, beside `parse.ts` decoding, `internal/store.ts` encoding and
// `channel/internal/line.ts`. It writes through the same `writeTranscript`, so it
// carries the same D1 risk and had no gate at all — and of the 14,045 lines
// already on disk, the Archive path wrote 13,134 of them.

/** Every required key of an `ArchiveMessage`, and not one optional. */
const bareArchive = (): ArchiveMessage => ({
  from: "archive",
  kind: "message",
  wall: "14/02/2025, 4:06:10 PM",
  at: RT_AT,
  zone: "Africa/Accra",
  who: { label: "Rex" },
  text: "hello",
});

/** Every required key of an `ArchiveEvent`, and not one optional. */
const bareEvent = (): ArchiveEvent => ({
  from: "archive",
  kind: "event",
  wall: "14/02/2025, 4:05:10 PM",
  at: RT_AT,
  zone: "Africa/Accra",
  event: "added",
  who: { label: "Rex" },
  raw: "Rex added Sam",
});

/** One case per optional on `ArchiveMessage` and `ArchiveEvent` — `types.ts:11-52`. */
const ARCHIVE_OPTIONALS = [
  ["edited", (): ArchiveLine => ({ ...bareArchive(), edited: true }), bareArchive],
  ["deleted", (): ArchiveLine => ({ ...bareArchive(), deleted: true }), bareArchive],
  [
    "media",
    (): ArchiveLine => ({ ...bareArchive(), media: { state: "NoHandle", why: "placeholder" } }),
    bareArchive,
  ],
  ["subject", (): ArchiveLine => ({ ...bareEvent(), subject: "Dinner" }), bareEvent],
] as const satisfies readonly (readonly [string, () => ArchiveLine, () => ArchiveLine])[];

for (const [name, withIt, without] of ARCHIVE_OPTIONALS) {
  it(`roundtrip — Archive \`${name}\` present survives the file, key for key`, async () => {
    const transcript = await place();
    const line = withIt();
    expect(wrote(await writeTranscript(transcript, [line])).lines).toStrictEqual([line]);
    expect(await readTranscript(transcript)).toStrictEqual([line]);
  });

  it(`roundtrip — Archive \`${name}\` absent leaves no key behind`, async () => {
    const transcript = await place();
    const line = without();
    await writeTranscript(transcript, [line]);
    const back = await readTranscript(transcript);
    if ("problems" in back) throw new Error("readTranscript refused a bare Archive line");
    expect(name in back[0]).toBe(false);
    expect(back).toStrictEqual([line]);
  });
}

it("roundtrip — an Archive line's reader form is a fixed point too", async () => {
  for (const [, withIt] of ARCHIVE_OPTIONALS) {
    const line = withIt();
    const first = await place();
    await writeTranscript(first, [line]);
    const back = await readTranscript(first);
    if ("problems" in back) throw new Error("readTranscript refused a written Archive line");
    expect(back).toStrictEqual([line]);

    const second = await place();
    await writeTranscript(second, back);
    const once = fs.readFileSync(second.path, "utf8");
    const again = await readTranscript(second);
    if ("problems" in again) throw new Error("readTranscript refused a re-written Archive line");

    const third = await place();
    await writeTranscript(third, again);
    expect(fs.readFileSync(third.path, "utf8")).toBe(once);
  }
});

/**
 * Producer bytes and reader bytes are the same bytes. Falsifier 2, strong form.
 *
 * They were not. `archive/internal/classify.ts` writes `kind` second and the old
 * hand-written `parse.ts` rebuilt it sixth, so no line read back could regenerate
 * the bytes it came from, and 13,134 Archive lines sat on disk in an order nothing
 * could reproduce. Nothing broke, because `same()` sorted keys before comparing —
 * but the sorter was treating the symptom.
 *
 * One declaration in `internal/parse.ts` now both decodes and encodes, in the key
 * order the file already has, so the encoding is canonical and ADR 006 falsifier 2
 * — "`optionalKey` does not encode to the bytes already on disk" — is answered
 * here rather than argued.
 */
it("roundtrip — a decoded line re-encodes to the exact bytes it came from", async () => {
  const line: ArchiveLine = { ...bareArchive(), edited: true };
  const first = await place();
  await writeTranscript(first, [line]);
  const produced = fs.readFileSync(first.path, "utf8");

  const back = await readTranscript(first);
  if ("problems" in back) throw new Error("readTranscript refused the Archive line");
  const second = await place();
  await writeTranscript(second, back);

  expect(fs.readFileSync(second.path, "utf8")).toBe(produced);
  expect(produced).toContain('{"from":"archive","kind":"message"');
});
