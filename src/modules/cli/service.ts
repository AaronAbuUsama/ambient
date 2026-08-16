/**
 * argv to a command, and nothing else. Every handler is one file under
 * `internal/commands/`; every string a human sees comes from `home.describe`
 * or from the usage text below.
 */

import { openHome } from "../home/service.ts";
import type { Command } from "./internal/command.ts";
import { misuse, report } from "./internal/command.ts";
import { agentAdd } from "./internal/commands/agent-add.ts";
import { chatAdd } from "./internal/commands/chat-add.ts";
import { doctor } from "./internal/commands/doctor.ts";
import { init } from "./internal/commands/init.ts";
import type { Run } from "./types.ts";

const USAGE = `ambient — a durable conversational home

  ambient init                 create or repair the home
  ambient doctor               report everything wrong with it
  ambient chat add <slug>      scaffold a chat
  ambient agent add <name>     scaffold a background agent

  --home <path>                override $AMBIENT_HOME (default ~/.ambient)
`;

const COMMANDS: Readonly<Record<string, Command>> = {
  init,
  doctor,
  chat: chatAdd,
  agent: agentAdd,
};

export const run: Run = async (argv, defaultRoot) => {
  const args = [...argv];
  const flag = args.indexOf("--home");
  const override = flag === -1 ? undefined : args.splice(flag, 2)[1];
  if (flag !== -1 && override === undefined) return misuse("--home needs a path");

  const [name, ...rest] = args;
  if (name === undefined || name === "--help" || name === "-h") return misuse(USAGE);
  const command = COMMANDS[name];
  if (command === undefined) return misuse(`unknown command "${name}"\n\n${USAGE}`);

  const home = openHome(override ?? defaultRoot);
  if ("problems" in home) return report(home.problems);
  return await command(home, rest);
};
