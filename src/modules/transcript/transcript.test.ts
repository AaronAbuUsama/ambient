/** `transcript` through its interface, against a real temp directory. */

import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { openHome } from "~/modules/home/service.ts";
import type { Place } from "~/modules/home/types.ts";
import { readTranscript, writeTranscript } from "./service.ts";
import type { ArchiveMessage, TranscriptWrite } from "./types.ts";

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
