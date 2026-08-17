/** `archive` through its interface. */

import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { openArchive, readArchive, resolveMedia } from "./service.ts";
import type { ArchiveRead } from "./types.ts";

const made: string[] = [];

const fixture = (name: "media" | "text"): string => {
  const dir = fs.mkdtempSync(`${os.tmpdir()}/ambient-archive-`);
  made.push(dir);
  const target = `${dir}/${name}.zip`;
  const encoded = fs.readFileSync(`${import.meta.dirname}/fixtures/${name}.zip.base64`, "utf8");
  fs.writeFileSync(target, Buffer.from(encoded.trim(), "base64"));
  return target;
};

afterEach(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const read = (text: string, zone = "Africa/Accra"): ArchiveRead => {
  const result = readArchive(text, zone);
  if ("problems" in result) throw new Error("expected the Archive to be readable");
  return result;
};

const messages = (archive: ArchiveRead) => archive.lines.filter((line) => line.kind === "message");

it("refuses non-Archives, ambiguous date order, and fixed offsets as declared values", () => {
  expect(readArchive("notes", "Africa/Accra")).toEqual({
    problems: [{ _tag: "NotAnArchive" }],
  });
  expect(readArchive("[01/02/2025, 4:06 PM] Rex: hello", "Africa/Accra")).toEqual({
    problems: [{ _tag: "AmbiguousDateOrder" }],
  });
  expect(readArchive("[14/02/2025, 4:06 PM] Rex: hello", "+00:00")).toEqual({
    problems: [{ _tag: "InvalidZone", zone: "+00:00" }],
  });
});

it("reads measured clock forms, direction marks, continuations, and a colon in a sender", () => {
  const archive = read(
    [
      "[14/02/2025, 4:06:10\u202fPM] Team: Rex: first line",
      "second line",
      "[15/02/2025, 16:07] Team: Rex: next",
      "\u200e[16/02/2025, 12:00 AM]\u200e Team: Rex: midnight",
    ].join("\n"),
  );
  expect(messages(archive).map((message) => message.who.label)).toEqual([
    "Team: Rex",
    "Team: Rex",
    "Team: Rex",
  ]);
  expect(messages(archive).map((message) => message.text)).toEqual([
    "first line\nsecond line",
    "next",
    "midnight",
  ]);
  expect(messages(archive).map((message) => message.wall)).toEqual([
    "14/02/2025, 4:06:10\u202fPM",
    "15/02/2025, 16:07",
    "16/02/2025, 12:00 AM",
  ]);
  expect(archive.continuations).toBe(1);
});

it("resolves every Wall clock in its IANA Zone", () => {
  const accra = read("[14/02/2025, 4:06:10 PM] Rex: hello");
  const newYork = read("[14/02/2025, 4:06:10 PM] Rex: hello", "America/New_York");
  expect(new Date(messages(accra)[0]!.at).toISOString()).toBe("2025-02-14T16:06:10.000Z");
  expect(new Date(messages(newYork)[0]!.at).toISOString()).toBe("2025-02-14T21:06:10.000Z");
  expect(messages(accra)[0]).toMatchObject({
    from: "archive",
    kind: "message",
    zone: "Africa/Accra",
    who: { label: "Rex" },
    text: "hello",
  });
});

it("reports malformed Wall clocks without losing later Messages", () => {
  const archive = read(
    [
      "[14/02/2025, 4:06:10 PM] Rex: real",
      "[31/04/2025, 4:06:10 PM] Rex: impossible",
      "[15/05/2025, 4:06:10 PM] Rex: later",
    ].join("\n"),
  );
  expect(messages(archive).map((message) => message.text)).toEqual(["real", "later"]);
  expect(archive.unparsed).toEqual([{ line: 2, reason: "malformed-wall-clock" }]);
});

it("preserves events, Placeholders, edits and deletions as distinct shapes", () => {
  const archive = read(
    [
      "[14/02/2025, 4:06:10 PM] Sam: \u200eRex added Sam",
      "[14/02/2025, 4:07:10 PM] Rex: \u200eRex pinned a message",
      "[14/02/2025, 4:08:10 PM] Rex: a caption image omitted",
      "[14/02/2025, 4:09:10 PM] Rex: corrected <This message was edited>",
      "[14/02/2025, 4:10:10 PM] Rex: \u200eThis message was deleted",
    ].join("\n"),
  );
  expect(archive.lines).toMatchObject([
    { kind: "event", event: "added", raw: "Rex added Sam" },
    { kind: "event", event: "other", raw: "Rex pinned a message" },
    {
      kind: "message",
      text: "a caption",
      media: { state: "NoHandle", why: "placeholder" },
    },
    { kind: "message", text: "corrected", edited: true },
    { kind: "message", text: "This message was deleted", deleted: true },
  ]);
  expect(archive.counts).toEqual({
    messages: 3,
    events: 2,
    placeholders: 1,
    edits: 1,
    deletions: 1,
    markers: 0,
    resolved: 0,
    unresolved: 0,
  });
  expect(Object.keys(archive.lines[2] ?? {})).not.toEqual(
    expect.arrayContaining(["id", "quoted", "mentions", "reaction"]),
  );
});

it("uses WhatsApp's structural mark, not words in ordinary prose, to identify Events", () => {
  const archive = read(
    [
      "[14/02/2025, 4:06:10 PM] Rex: I added a dummy address",
      "[14/02/2025, 4:07:10 PM] Rex: you're the only one left",
      "[14/02/2025, 4:08:10 PM] Rex: \u200eVoice call, \u200e\u200e28 min • \u200e4 joined",
      "[14/02/2025, 4:09:10 PM] Rex: \u200eRex changed this group's settings to allow only admins to send messages to this group",
      "[14/02/2025, 4:10:10 PM] Rex: \u200ePOLL:",
      "Which one?",
      "OPTION: one (1 vote)",
    ].join("\n"),
  );
  expect(archive.lines.map((line) => line.kind)).toEqual([
    "message",
    "message",
    "event",
    "event",
    "message",
  ]);
  expect(messages(archive).map((message) => message.text)).toEqual([
    "I added a dummy address",
    "you're the only one left",
    "POLL:\nWhich one?\nOPTION: one (1 vote)",
  ]);
  expect(archive.counts).toMatchObject({ messages: 3, events: 2 });
});

it("reads a one-file ZIP identically to bare text", async () => {
  const opened = await openArchive(fixture("text"), "Africa/Accra");
  if ("problems" in opened) throw new Error("expected the ZIP to be readable");
  expect(opened.form).toBe("zip-text");
  expect(opened.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(new TextDecoder().decode(opened.primary)).toBe(
    "[14/02/2025, 4:06:10 PM] Rex: one\n[15/02/2025, 4:07:00 PM] Sam: two\n",
  );
  expect(opened.media).toEqual([]);
  expect(opened.read).toEqual(
    readArchive(
      "[14/02/2025, 4:06:10 PM] Rex: one\n[15/02/2025, 4:07:00 PM] Sam: two\n",
      "Africa/Accra",
    ),
  );
  opened.close();
});

it("decodes raw UTF-8 media names and preserves a missing Marker", async () => {
  const opened = await openArchive(fixture("media"), "Africa/Accra");
  if ("problems" in opened) throw new Error("expected the ZIP to be readable");
  expect(opened.form).toBe("zip-media");
  expect(opened.media.map((entry) => entry.name)).toEqual(["photo–one.jpg", "photo two.jpg"]);
  const hash = "a".repeat(64);
  const resolved = resolveMedia(
    opened.read,
    new Map([
      ["photo–one.jpg", hash],
      ["photo two.jpg", hash],
    ]),
  );
  expect(resolved.lines.map((line) => (line.kind === "message" ? line.media : undefined))).toEqual([
    { state: "Stored", hash },
    { state: "Stored", hash },
    { state: "NoHandle", why: "not-in-archive" },
  ]);
  expect(resolved.counts).toMatchObject({ markers: 3, resolved: 2, unresolved: 1 });
  opened.close();
});
