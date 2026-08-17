/** History Import's primary-source and Receipt gate, through argv only. */

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { openBlobs } from "~/modules/blobs/service.ts";
import { openHome } from "~/modules/home/service.ts";
import { readTranscript } from "~/modules/transcript/service.ts";
import { run } from "./service.ts";

const made: string[] = [];

const home = (): string => {
  const dir = fs.mkdtempSync(`${os.tmpdir()}/ambient-receipt-`);
  made.push(dir);
  return `${dir}/home`;
};

afterEach(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const archive = ["[14/02/2025, 4:06:10 PM] Rex: one", "[15/02/2025, 4:07:00 PM] Sam: two"].join(
  "\n",
);

it("keeps the primary source and one complete Receipt per Archive hash", async () => {
  const root = home();
  const input = `${root}.txt`;
  const source = `unreadable preamble\n${archive}\n`;
  const hash = createHash("sha256").update(source).digest("hex");
  await run(["init", "--home", root], "/nowhere");
  await run(["chat", "add", "fixture", "--home", root], "/nowhere");
  fs.writeFileSync(input, source);

  expect(
    await run(
      ["import", input, "--into", "fixture", "--zone", "Africa/Accra", "--home", root],
      "/nowhere",
    ),
  ).toMatchObject({
    said: "Imported 2 Messages and 0 Events (2 Transcript lines) into fixture using Zone Africa/Accra; 1 unreadable line at 1",
  });
  const receiptDir = `${root}/chats/fixture/imports/${hash}`;
  expect(fs.readFileSync(`${receiptDir}/_chat.txt`)).toEqual(Buffer.from(source));
  const first: unknown = JSON.parse(fs.readFileSync(`${receiptDir}/receipt.json`, "utf8"));
  expect(first).toMatchObject({
    archive: { sha256: hash, bytes: Buffer.byteLength(source), form: "text" },
    reader: { version: 2 },
    zone: { name: "Africa/Accra", source: "given" },
    transcript: {
      messagesWritten: 2,
      messagesSkipped: 0,
      linesWritten: 2,
      linesSkipped: 0,
      span: {
        oldest: Date.parse("2025-02-14T16:06:10.000Z"),
        newest: Date.parse("2025-02-15T16:07:00.000Z"),
      },
    },
    counts: {
      messages: 2,
      markers: 0,
      resolved: 0,
      unresolved: 0,
      placeholders: 0,
      events: 0,
      edits: 0,
      deletions: 0,
    },
    findings: [{ kind: "unreadable-line", line: 1, reason: "no-message" }],
  });

  await run(
    ["import", input, "--into", "fixture", "--zone", "Africa/Accra", "--home", root],
    "/nowhere",
  );
  expect(fs.readdirSync(`${root}/chats/fixture/imports`)).toEqual([hash]);
  const second: unknown = JSON.parse(fs.readFileSync(`${receiptDir}/receipt.json`, "utf8"));
  expect(second).toMatchObject({
    transcript: { messagesWritten: 0, messagesSkipped: 2, linesWritten: 0, linesSkipped: 2 },
  });

  fs.writeFileSync(input, `${source}[16/02/2025, 4:08:00 PM] Rex: newer\n`);
  await run(
    ["import", input, "--into", "fixture", "--zone", "Africa/Accra", "--home", root],
    "/nowhere",
  );
  expect(fs.readdirSync(`${root}/chats/fixture/imports`)).toHaveLength(2);
});

it("a populated Chat is only a folder label and survives a rename", async () => {
  const root = home();
  const old = "old-chat-label";
  const renamed = "better-label";
  const input = `${root}.zip`;
  const encoded = fs.readFileSync(
    `${import.meta.dirname}/../archive/fixtures/media.zip.base64`,
    "utf8",
  );
  fs.writeFileSync(input, Buffer.from(encoded.trim(), "base64"));
  await run(["init", "--home", root], "/nowhere");
  await run(["chat", "add", old, "--home", root], "/nowhere");
  await run(["import", input, "--into", old, "--zone", "Africa/Accra", "--home", root], "/nowhere");
  fs.renameSync(`${root}/chats/${old}`, `${root}/chats/${renamed}`);

  expect(await run(["doctor", "--home", root], "/nowhere")).toEqual({
    kind: "report",
    problems: [],
  });
  const opened = openHome(root);
  if ("problems" in opened) throw new Error("expected the renamed home to open");
  const place = opened.chat(renamed).transcript();
  if ("problems" in place) throw new Error("expected the renamed Transcript Place");
  const transcript = await readTranscript(place);
  if ("problems" in transcript) throw new Error("expected the renamed Transcript to read");
  expect(transcript).toHaveLength(3);
  const hashes = transcript.flatMap((line) =>
    line.kind === "message" && line.media?.state === "Stored" ? [line.media.hash] : [],
  );
  const blobs = openBlobs(opened.blobs);
  expect(await Promise.all(hashes.map((hash) => blobs.exists(hash)))).toEqual([true, true]);

  const before = fs.readFileSync(place.path);
  await run(
    ["import", input, "--into", renamed, "--zone", "Africa/Accra", "--home", root],
    "/nowhere",
  );
  expect(fs.readFileSync(place.path)).toEqual(before);
  const mentions = fs
    .readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((relative) => fs.statSync(`${root}/${relative}`).isFile())
    .filter((relative) => fs.readFileSync(`${root}/${relative}`).includes(old));
  expect(mentions).toEqual([`chats/${renamed}/mandate.md`]);
});
