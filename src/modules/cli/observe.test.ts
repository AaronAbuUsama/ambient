/**
 * `ambient observe --from <slug>` — gate rows 12-15 of
 * [`docs/planning/knowledge/spec.md`](../../../docs/planning/knowledge/spec.md).
 *
 * **Row 12's "14 on the real Transcript" is not asserted here.** This Slice's
 * agent does not have the principal's real archive and must never touch
 * `~/.ambient` — the ticket says so. What is tested instead is the *rule* row
 * 12 states — one document per distinct sender label — against synthetic
 * lines in a temp directory, which is everything a test run in this
 * environment can prove.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { openHome } from "~/modules/home/service.ts";
import { writeTranscript } from "~/modules/transcript/service.ts";
import type { ArchiveMessage } from "~/modules/transcript/types.ts";
import { run } from "./service.ts";

const made: string[] = [];

afterEach(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const message = (label: string, text: string): ArchiveMessage => ({
  from: "archive",
  kind: "message",
  wall: "14/02/2025, 4:06:10 PM",
  at: Date.parse("2025-02-14T16:06:10Z"),
  zone: "Africa/Accra",
  who: { label },
  text,
});

/** A fresh home with a Chat's Transcript already seeded — `root`, ready for `run`. */
const seeded = async (lines: readonly ArchiveMessage[]): Promise<string> => {
  const root = `${fs.mkdtempSync(`${os.tmpdir()}/ambient-observe-`)}/home`;
  made.push(root.slice(0, root.lastIndexOf("/")));
  const home = openHome(root);
  if ("problems" in home) throw new Error("openHome refused the temp directory");
  expect(await home.converge()).toStrictEqual([]);
  expect(await home.chat("fixture").converge()).toStrictEqual([]);
  const place = home.chat("fixture").transcript();
  if ("problems" in place) throw new Error("home refused the Transcript Place");
  const wrote = await writeTranscript(place, lines);
  if ("problems" in wrote) throw new Error("writeTranscript refused the seed lines");
  return root;
};

/** What `write` puts on disk for a bare `Person` — bytes, not an object. */
const personBytes = (name: string): string =>
  `---\ntype: Person\nname: ${name}\naliases: []\nnumbers: []\nstatus: unreviewed\nsource: history\n---\n`;

it("row 12 · 13 — one document per distinct sender label, each unreviewed and from history", async () => {
  const root = await seeded([
    message("Rex", "one"),
    message("Sam", "two"),
    message("Rex", "three"),
    message("Pat", "four"),
    message("Sam", "five"),
  ]);

  const result = await run(["observe", "--from", "fixture", "--home", root], "/nowhere");
  expect(result).toMatchObject({ kind: "message", ok: true, said: "wrote 3" });

  const dir = `${root}/knowledge/person`;
  expect(fs.readdirSync(dir).sort()).toStrictEqual(["pat.md", "rex.md", "sam.md"]);
  for (const [file, name] of [
    ["pat.md", "Pat"],
    ["rex.md", "Rex"],
    ["sam.md", "Sam"],
  ] as const) {
    expect(fs.readFileSync(`${dir}/${file}`, "utf8")).toStrictEqual(personBytes(name));
  }
});

it("row 14 — a second run writes 0 and leaves every file's inode unchanged", async () => {
  const root = await seeded([message("Rex", "one"), message("Sam", "two")]);
  await run(["observe", "--from", "fixture", "--home", root], "/nowhere");

  const dir = `${root}/knowledge/person`;
  const before = {
    rex: fs.statSync(`${dir}/rex.md`).ino,
    sam: fs.statSync(`${dir}/sam.md`).ino,
  };

  const second = await run(["observe", "--from", "fixture", "--home", root], "/nowhere");
  expect(second).toStrictEqual({ kind: "message", ok: true, said: "wrote 0" });
  expect(fs.statSync(`${dir}/rex.md`).ino).toStrictEqual(before.rex);
  expect(fs.statSync(`${dir}/sam.md`).ino).toStrictEqual(before.sam);
});

it("row 15 — a hand-edit to a document survives a second run byte-identically", async () => {
  const root = await seeded([message("Rex", "one")]);
  await run(["observe", "--from", "fixture", "--home", root], "/nowhere");

  const path = `${root}/knowledge/person/rex.md`;
  const edited = `---\ntype: Person\nname: Rex\naliases:\n  - Rexy\nnumbers: []\nstatus: reviewed\nsource: history\n---\n\n# Rex\n\nHand-corrected.\n`;
  fs.writeFileSync(path, edited);
  const before = fs.readFileSync(path);

  const second = await run(["observe", "--from", "fixture", "--home", root], "/nowhere");
  expect(second).toStrictEqual({ kind: "message", ok: true, said: "wrote 0" });
  expect(fs.readFileSync(path)).toStrictEqual(before);
  expect(fs.readFileSync(path, "utf8")).toStrictEqual(edited);
});

it("a wrong observe command line is misuse", async () => {
  const root = await seeded([]);
  expect(await run(["observe", "--home", root], "/nowhere")).toStrictEqual({
    kind: "misuse",
    said: "usage: ambient observe --from <slug>",
  });
  expect(
    await run(["observe", "--from", "fixture", "extra", "--home", root], "/nowhere"),
  ).toStrictEqual({
    kind: "misuse",
    said: "usage: ambient observe --from <slug>",
  });
});

it("names the chat, not a stack trace, when the slug has no Chat", async () => {
  const root = await seeded([]);
  expect(await run(["observe", "--from", "ghost", "--home", root], "/nowhere")).toStrictEqual({
    kind: "message",
    ok: false,
    said: 'Chat "ghost" does not exist; run `ambient chat add ghost` first',
  });
});
