#!/usr/bin/env node
/**
 * `ambient` — command wiring only. No logic. Rendering lives in `home.describe`;
 * this file prints a string and sets an exit code.
 *
 * The composition root: the one place that reads the environment and resolves a
 * home root. `home` receives a string.
 */

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";

import { describe, openHome } from "../modules/home/index.ts";
import type { Problem } from "../modules/home/index.ts";

const USAGE = `ambient — a durable conversational home

  ambient init                 create or repair the home
  ambient doctor               report everything wrong with it
  ambient chat add <slug>      scaffold a chat
  ambient agent add <name>     scaffold a background agent

  --home <path>                override $AMBIENT_HOME (default ~/.ambient)
`;

/** The one real port: two adapters exist on day one, this and a stub in the gate. */
const initKnowledge = (dir: string): Promise<string | void> =>
  mkdir(dir, { recursive: true }).then(
    () =>
      new Promise<string | void>((resolve) => {
        const ok = spawn("ok", ["init", "--no-mcp", "--no-skills"], { cwd: dir });
        let said = "";
        ok.stderr.on("data", (chunk: Buffer) => {
          said += chunk.toString();
        });
        ok.on("error", (e) => resolve(`ok init: ${e.message}`));
        ok.on("close", (code) =>
          resolve(code === 0 ? undefined : `ok init exited ${String(code)} — ${said.trim()}`),
        );
      }),
  );

const report = (problems: readonly Problem[]): never => {
  for (const p of problems) process.stdout.write(`${describe(p)}\n`);
  process.exit(problems.length === 0 ? 0 : 1);
};

const fail = (message: string): never => {
  process.stderr.write(`${message}\n`);
  process.exit(2);
};

const main = async (argv: readonly string[]): Promise<never> => {
  const args = [...argv];
  const flag = args.indexOf("--home");
  const override = flag === -1 ? undefined : args.splice(flag, 2)[1];
  if (flag !== -1 && override === undefined) return fail("--home needs a path");

  const root = override ?? process.env.AMBIENT_HOME ?? `${homedir()}/.ambient`;
  const [command, ...rest] = args;
  if (command === undefined || command === "--help" || command === "-h") return fail(USAGE);

  const home = openHome(root, { initKnowledge });
  if ("problems" in home) return report(home.problems);

  switch (command) {
    case "init":
      return report(await home.converge());
    case "doctor":
      return report(home.plan());
    case "chat":
    case "agent": {
      const [verb, name] = rest;
      if (verb !== "add" || name === undefined) return fail(`usage: ambient ${command} add <name>`);
      const unit = command === "chat" ? home.chat(name) : home.agent(name);
      return report(await unit.converge());
    }
    default:
      return fail(`unknown command "${command}"\n\n${USAGE}`);
  }
};

await main(process.argv.slice(2));
