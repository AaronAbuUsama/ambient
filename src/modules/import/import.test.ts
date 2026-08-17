/**
 * `import`, through `runImport` only. Real temp directories: this module exists for the
 * order of its writes, and rename atomicity is what a memfs stand-in models as fiction.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, expect, it } from "vite-plus/test";

import { openHome } from "~/modules/home/service.ts";
import type { Place } from "~/modules/home/types.ts";
import { runImport, summarise } from "./service.ts";

const made: string[] = [];
const tempRoot = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ambient-import-"));
  made.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const SOURCE = "[14/02/2025, 4:06:10 PM] Rex: one\n[15/02/2025, 4:07:00 PM] Rex: two\n";

/** A home with one chat, and the three places an import needs. */
async function fixture(): Promise<{
  readonly places: { transcript: Place; imports: Place; blobs: Place };
  readonly root: string;
}> {
  const root = tempRoot();
  const home = openHome(root);
  if ("problems" in home) throw new Error("fixture home did not open");
  await home.converge();
  const chat = home.chat("fixture");
  await chat.converge();
  const transcript = chat.transcript();
  const imports = chat.imports();
  if ("problems" in transcript || "problems" in imports) throw new Error("fixture grants failed");
  return { places: { transcript, imports, blobs: home.blobs }, root };
}

const archiveAt = (root: string): string => {
  const at = path.join(root, "export.txt");
  fs.writeFileSync(at, SOURCE);
  return at;
};

it("reports what it wrote, and says which Zone it used", async () => {
  const { places, root } = await fixture();
  const report = await runImport({
    file: archiveAt(root),
    ...places,
    zone: "Africa/Accra",
    zoneGiven: true,
  });
  if ("problems" in report) throw new Error(`import failed: ${JSON.stringify(report.problems)}`);

  expect(report.messages).toBe(2);
  expect(report.written).toBe(2);
  expect(report.rerun).toBe(false);
  expect(report.zone).toEqual({ name: "Africa/Accra", given: true });
  expect(summarise(report, "fixture")).toContain("into fixture using Zone Africa/Accra");
});

it("re-running writes nothing, and the Receipt still describes the run that did", async () => {
  const { places, root } = await fixture();
  const request = {
    file: archiveAt(root),
    ...places,
    zone: "Africa/Accra",
    zoneGiven: true,
  } as const;

  const first = await runImport(request);
  if ("problems" in first) throw new Error("first import failed");
  const second = await runImport(request);
  if ("problems" in second) throw new Error("second import failed");

  expect(second.written).toBe(0);
  expect(second.skipped).toBe(2);
  expect(second.rerun).toBe(true);

  // The defect this replaces: the Receipt used to be rewritten by every run, so a re-import
  // left `linesWritten: 0` beside a full Transcript — provenance saying the lines came from
  // somewhere else.
  const dir = fs.readdirSync(places.imports.path)[0];
  if (dir === undefined) throw new Error("no Receipt directory");
  const receipt: unknown = JSON.parse(
    fs.readFileSync(path.join(places.imports.path, dir, "receipt.json"), "utf8"),
  );
  expect(receipt).toMatchObject({
    transcript: { linesWritten: 2, linesSkipped: 0 },
    reruns: [{ written: 0, skipped: 2 }],
  });
});

it("refuses an Archive that is not there, as a value rather than a throw", async () => {
  const { places, root } = await fixture();
  const report = await runImport({
    file: path.join(root, "absent.txt"),
    ...places,
    zone: "Africa/Accra",
    zoneGiven: true,
  });
  if (!("problems" in report)) throw new Error("expected a failure");
  expect(report.problems[0]?._tag).toBe("Unreadable");
});

it("records a defaulted Zone as defaulted", async () => {
  const { places, root } = await fixture();
  const report = await runImport({
    file: archiveAt(root),
    ...places,
    zone: "Etc/UTC",
    zoneGiven: false,
  });
  if ("problems" in report) throw new Error("import failed");
  expect(report.zone.given).toBe(false);
  expect(summarise(report, "fixture")).toContain("default Zone Etc/UTC");
});
