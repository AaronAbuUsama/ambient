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
const outcome = await run(process.argv.slice(2), defaultRoot);

if (outcome.kind === "misuse") {
  process.stderr.write(`${outcome.said}\n`);
  process.exit(2);
}

for (const p of outcome.problems) process.stdout.write(`${describe(p)}\n`);
process.exit(outcome.problems.length === 0 ? 0 : 1);
