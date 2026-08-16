import type { Command } from "../command.ts";
import { misuse, report } from "../command.ts";

/**
 * `ambient agent add <name>` — `home.agent(name).converge()`. Same shape as
 * `chat add`, over the other inhabitant.
 */
export const agentAdd: Command = async (home, rest) => {
  const [verb, name] = rest;
  if (verb !== "add" || name === undefined) return misuse("usage: ambient agent add <name>");
  return report(await home.agent(name).converge());
};
