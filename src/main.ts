#!/usr/bin/env node
/**
 * The composition root and the process edge. It resolves where the home is,
 * runs the CLI, prints and exits — and that is the whole of it.
 *
 * This is the only file in the repository that reads `process.env`.
 */

import { homedir } from "node:os";

import { run } from "./modules/cli/service.ts";
import { describe } from "./modules/home/service.ts";

const defaultRoot = process.env.AMBIENT_HOME ?? `${homedir()}/.ambient`;
const defaultZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const outcome = await run(process.argv.slice(2), defaultRoot, defaultZone, (line) => {
  process.stdout.write(`${line}\n`);
});

if (outcome.kind === "misuse") {
  process.stderr.write(`${outcome.said}\n`);
  process.exit(2);
}

if (outcome.kind === "message") {
  const output = outcome.ok ? process.stdout : process.stderr;
  output.write(`${outcome.said}\n`);
  process.exit(outcome.ok ? 0 : 1);
}

for (const p of outcome.problems) process.stdout.write(`${describe(p)}\n`);
process.exit(outcome.problems.length === 0 ? 0 : 1);
