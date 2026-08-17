/** `blobs` through its interface, against a real temp directory. */

import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { openHome } from "~/modules/home/service.ts";
import { openBlobs } from "./service.ts";

const made: string[] = [];

const store = async () => {
  const root = `${fs.mkdtempSync(`${os.tmpdir()}/ambient-blobs-`)}/home`;
  made.push(root);
  const home = openHome(root);
  if ("problems" in home) throw new Error("openHome refused the temp directory");
  expect(await home.converge()).toEqual([]);
  return { root, blobs: openBlobs(home.blobs) };
};

afterEach(() => {
  for (const root of made.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

it("stores identical bytes once and addresses them only by hash", async () => {
  const { root, blobs } = await store();
  const bytes = new TextEncoder().encode("same bytes");
  const first = await blobs.put(bytes);
  const second = await blobs.put(bytes);
  if ("problems" in first || "problems" in second) throw new Error("put failed");
  expect(first).toMatchObject({ bytes: 10, stored: true });
  expect(second).toEqual({ ...first, stored: false });
  expect(await blobs.exists(first.hash)).toBe(true);
  expect(await blobs.get(first.hash)).toEqual(bytes);
  expect(fs.readdirSync(`${root}/blobs`)).toEqual([first.hash]);
});

it("streams bytes and refuses a fabricated hash as a declared value", async () => {
  const { blobs } = await store();
  const chunks = async function* () {
    yield new TextEncoder().encode("one ");
    yield new TextEncoder().encode("two");
  };
  const put = await blobs.put(chunks());
  if ("problems" in put) throw new Error("put failed");
  expect(await blobs.get(put.hash)).toEqual(new TextEncoder().encode("one two"));
  expect(await blobs.exists("nope")).toEqual({
    problems: [{ _tag: "BadHash", hash: "nope" }],
  });
});
