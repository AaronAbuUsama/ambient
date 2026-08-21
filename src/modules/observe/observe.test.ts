/**
 * `observe` through its interface — a list in, a value out. No fixtures, no
 * temp directory: both `from` and `unseen` are pure.
 *
 * The gate rows about a whole pass landing on disk (12-15) are through
 * `ambient observe --from <slug>` in
 * [`../cli/observe.test.ts`](../cli/observe.test.ts) instead — this file is
 * the "list a page a text" version [`design.md`](../../../docs/planning/knowledge/design.md)'s
 * test-seam table asks for.
 */

import { expect, it } from "vite-plus/test";

import type { Document, Observation } from "~/modules/knowledge/types.ts";
import type { ArchiveEvent, ArchiveMessage, LiveMessage } from "~/modules/transcript/types.ts";
import { from, unseen } from "./service.ts";

const message = (label: string, text = "hi"): ArchiveMessage => ({
  from: "archive",
  kind: "message",
  wall: "14/02/2025, 4:06:10 PM",
  at: Date.parse("2025-02-14T16:06:10Z"),
  zone: "Africa/Accra",
  who: { label },
  text,
});

const event = (label: string): ArchiveEvent => ({
  from: "archive",
  kind: "event",
  wall: "14/02/2025, 4:06:10 PM",
  at: Date.parse("2025-02-14T16:06:10Z"),
  zone: "Africa/Accra",
  event: "added",
  who: { label },
  raw: "raw",
});

const live: LiveMessage = {
  from: "live",
  kind: "message",
  at: Date.parse("2025-02-14T16:06:10Z"),
  id: "1",
  who: { id: "lid:1", mode: "lid", pushName: "Rex" },
  msgKind: "text",
};

const person = (name: string): Observation => ({
  type: "Person",
  name,
  frontmatter: { aliases: [], numbers: [], status: "unreviewed", source: "history" },
});

const documentOf = (observation: Observation): Document => ({
  at: `person/${observation.name.toLowerCase()}.md`,
  type: observation.type,
  name: observation.name,
  frontmatter: observation.frontmatter,
  body: "",
});

it("one Person per distinct sender label, first seen, from Archive lines only", () => {
  const found = from([
    message("Rex"),
    message("Sam"),
    message("Rex"),
    event("Group"),
    live,
    event("Rex"),
  ]);
  expect(found).toStrictEqual([person("Rex"), person("Sam"), person("Group")]);
});

it("writes only what a script cannot be wrong about — aliases and numbers empty, status unreviewed, source history", () => {
  expect(from([message("Zeeshan")])).toStrictEqual([
    {
      type: "Person",
      name: "Zeeshan",
      frontmatter: { aliases: [], numbers: [], status: "unreviewed", source: "history" },
    },
  ]);
});

it("no lines, no Observations", () => {
  expect(from([])).toStrictEqual([]);
});

it("drops an Observation the base already holds, by identity and never by content", () => {
  const rex = person("Rex");
  const sam = person("Sam");
  const held: Document = {
    ...documentOf(rex),
    frontmatter: { ...rex.frontmatter, status: "reviewed" },
  };
  expect(unseen([rex, sam], [held])).toStrictEqual([sam]);
});

it("identity is (type, name) — a same-named Observation of a different type is not dropped", () => {
  const rex = person("Rex");
  const org: Observation = { ...rex, type: "Organization" };
  const held: Document = documentOf(org);
  expect(unseen([rex], [held])).toStrictEqual([rex]);
});

it("an empty base holds nothing back", () => {
  const found = [person("Rex"), person("Sam")];
  expect(unseen(found, [])).toStrictEqual(found);
});
