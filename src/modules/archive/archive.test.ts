/** `archive` through its string-only interface. */

import { expect, it } from "vite-plus/test";

import { readArchive } from "./service.ts";
import type { ArchiveRead } from "./types.ts";

const read = (text: string, zone = "Africa/Accra"): ArchiveRead => {
  const result = readArchive(text, zone);
  if ("problems" in result) throw new Error("expected the Archive to be readable");
  return result;
};

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
  expect(archive.messages.map((message) => message.who.label)).toEqual([
    "Team: Rex",
    "Team: Rex",
    "Team: Rex",
  ]);
  expect(archive.messages.map((message) => message.text)).toEqual([
    "first line\nsecond line",
    "next",
    "midnight",
  ]);
  expect(archive.messages.map((message) => message.wall)).toEqual([
    "14/02/2025, 4:06:10\u202fPM",
    "15/02/2025, 16:07",
    "16/02/2025, 12:00 AM",
  ]);
  expect(archive.continuations).toBe(1);
});

it("resolves every Wall clock in its IANA Zone", () => {
  const accra = read("[14/02/2025, 4:06:10 PM] Rex: hello");
  const newYork = read("[14/02/2025, 4:06:10 PM] Rex: hello", "America/New_York");
  expect(new Date(accra.messages[0]!.at).toISOString()).toBe("2025-02-14T16:06:10.000Z");
  expect(new Date(newYork.messages[0]!.at).toISOString()).toBe("2025-02-14T21:06:10.000Z");
  expect(accra.messages[0]).toMatchObject({
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
  expect(archive.messages.map((message) => message.text)).toEqual(["real", "later"]);
  expect(archive.unparsed).toEqual([{ line: 2, reason: "malformed-wall-clock" }]);
});
