/**
 * argv to a command, and nothing else. Every handler is one file under
 * `internal/commands/`; every string a human sees comes from `home.describe`
 * or from the usage text below.
 */

import { openHome } from "~/modules/home/service.ts";
import { misuse, report } from "./internal/command.ts";
import { agentAdd } from "./internal/commands/agent-add.ts";
import { chatAdd } from "./internal/commands/chat-add.ts";
import { doctor } from "./internal/commands/doctor.ts";
import { init } from "./internal/commands/init.ts";
import { importArchive } from "./internal/commands/import.ts";
import { ingest } from "./internal/commands/ingest.ts";
import { observe } from "./internal/commands/observe.ts";
import { ontology } from "./internal/commands/ontology.ts";
import { pairSource } from "./internal/commands/pair.ts";
import { peers } from "./internal/commands/peers.ts";
import type { Run } from "./types.ts";

const USAGE = `ambient — a durable conversational home

  ambient init                 create or repair the home
  ambient doctor               report everything wrong with it
  ambient chat add <slug>      scaffold a chat
  ambient agent add <name>     scaffold a background agent
  ambient import <archive> --into <slug> [--zone <IANA>]

  ambient pair <source>        link a live account, and spend its one-shot sync
  ambient peers <source>       list that account's conversations. Reads only
  ambient ingest --into <slug> copy one conversation into its Chat's Transcript

  ambient ontology lint        check the knowledge base against schema.yaml
  ambient ontology next        the work queue: status: unreviewed documents
    [--type=<type>] [--limit=<n>]
  ambient ontology index       rebuild the derived index at home.index
  ambient observe --from <slug> Transcript Lines to knowledge base documents

  --home <path>                override $AMBIENT_HOME (default ~/.ambient)
`;

const COMMANDS = {
  init,
  doctor,
  chat: chatAdd,
  agent: agentAdd,
  import: importArchive,
  pair: pairSource,
  peers,
  ingest,
  ontology,
  observe,
};

/**
 * argv's first token becomes a command name here, or it is not one.
 *
 * The table used to be annotated `Readonly<Record<string, Command>>`, which said
 * every string is a command and made the `undefined` check below unreachable to
 * the type system while being load-bearing at runtime. The table is closed, so
 * the honest question is whether this token is one of its keys — and after that
 * the lookup cannot miss.
 */
type CommandName = keyof typeof COMMANDS;

const isCommandName = (name: string): name is CommandName => name in COMMANDS;

export const run: Run = async (argv, defaultRoot, givenZone, say) => {
  const args = [...argv];
  const flag = args.indexOf("--home");
  const override = flag === -1 ? undefined : args.splice(flag, 2)[1];
  if (flag !== -1 && override === undefined) return misuse("--home needs a path");

  const [name, ...rest] = args;
  if (name === undefined || name === "--help" || name === "-h") return misuse(USAGE);
  if (!isCommandName(name)) return misuse(`unknown command "${name}"\n\n${USAGE}`);
  const command = COMMANDS[name];

  const home = openHome(override ?? defaultRoot);
  if ("problems" in home) return report(home.problems);
  const defaultZone = givenZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return await command(home, rest, defaultZone, say ?? (() => undefined));
};
