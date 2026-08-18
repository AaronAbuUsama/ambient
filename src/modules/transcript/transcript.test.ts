/** `transcript` through its interface, against a real temp directory. */

import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { openHome } from "~/modules/home/service.ts";
import type { Place } from "~/modules/home/types.ts";
import { readTranscript, writeTranscript } from "./service.ts";
import type {
  ArchiveEvent,
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
  const shaped: ArchiveMessage = {
    ...message("caption"),
    edited: true,
    deleted: true,
    media: { state: "NoHandle", why: "placeholder" },
  };
  const result = wrote(await writeTranscript(transcript, [event, shaped]));
  expect(result.lines).toEqual([event, shaped]);
  expect(result.messages).toEqual({ written: 1, skipped: 0 });
  expect(await readTranscript(transcript)).toEqual([event, shaped]);
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
