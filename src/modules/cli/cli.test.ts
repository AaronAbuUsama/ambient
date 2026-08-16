/**
 * `cli` through its own interface — argv in, an outcome out — plus one end-to-end
 * spawn, because exit codes are the vocabulary the gate is written in and only
 * the real process can prove them.
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { describe as render } from "../home/service.ts";
import { run } from "./service.ts";
import type { Outcome } from "./types.ts";

const made: string[] = [];

const tmp = (): string => {
  const dir = fs.mkdtempSync(`${os.tmpdir()}/ambient-cli-`);
  made.push(dir);
  return `${dir}/home`;
};

afterEach(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const said = (outcome: Outcome): string =>
  outcome.kind === "misuse" ? outcome.said : outcome.problems.map(render).join("\n");

it("init then doctor is silent; a broken home is not", async () => {
  const root = tmp();
  expect(await run(["init", "--home", root], "/nowhere")).toEqual({ kind: "report", problems: [] });
  expect(await run(["doctor", "--home", root], "/nowhere")).toEqual({
    kind: "report",
    problems: [],
  });

  fs.rmSync(`${root}/schema.yaml`);
  expect(said(await run(["doctor", "--home", root], "/nowhere"))).toBe("schema.yaml: missing");
});

it("chat add and agent add scaffold through the same verb", async () => {
  const root = tmp();
  await run(["init", "--home", root], "/nowhere");
  expect(await run(["chat", "add", "bug-reports", "--home", root], "/nowhere")).toEqual({
    kind: "report",
    problems: [],
  });
  expect(await run(["agent", "add", "linear", "--home", root], "/nowhere")).toEqual({
    kind: "report",
    problems: [],
  });
  expect(said(await run(["doctor", "--home", root], "/nowhere"))).toBe("");
});

it("a wrong command line is misuse, never confusable with an unhealthy home", async () => {
  expect(await run([], "/nowhere")).toMatchObject({ kind: "misuse" });
  expect(await run(["--home"], "/nowhere")).toEqual({
    kind: "misuse",
    said: "--home needs a path",
  });
  expect(await run(["chat"], "/nowhere")).toEqual({
    kind: "misuse",
    said: "usage: ambient chat add <slug>",
  });
  expect(said(await run(["bogus"], "/nowhere"))).toContain('unknown command "bogus"');
});

it("`--home` beats the default root", async () => {
  const root = tmp();
  await run(["init", "--home", root], `${tmp()}/never-touched`);
  expect(fs.existsSync(`${root}/identity.md`)).toBe(true);
});

// ── the exit codes the gate is written in ────────────────────────────

const ambient = (root: string, ...args: readonly string[]) => {
  const run = spawnSync(process.execPath, [`${import.meta.dirname}/../../main.ts`, ...args], {
    encoding: "utf8",
    env: { ...process.env, AMBIENT_HOME: root },
  });
  return { code: run.status, out: run.stdout };
};

it("the CLI exits 0 on a healthy home and 1 on a broken one, printing what is wrong", () => {
  const root = tmp();
  expect(ambient(root, "doctor")).toMatchObject({ code: 1 });
  expect(ambient(root, "init")).toEqual({ code: 0, out: "" });
  expect(ambient(root, "doctor")).toEqual({ code: 0, out: "" });
  expect(ambient(root, "chat", "add", "bug-reports")).toEqual({ code: 0, out: "" });
  expect(ambient(root, "agent", "add", "linear")).toEqual({ code: 0, out: "" });

  fs.rmSync(`${root}/chats/bug-reports/mandate.md`);
  expect(ambient(root, "doctor")).toEqual({
    code: 1,
    out: "chats/bug-reports/mandate.md: missing\n",
  });

  expect(ambient(root, "bogus")).toMatchObject({ code: 2, out: "" });
});
