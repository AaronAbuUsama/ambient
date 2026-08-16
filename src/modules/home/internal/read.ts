/**
 * How a unit reads: the global halves, the two files, the parse, the resolution.
 *
 * Every reader takes a `Problem[]` accumulator, pushes what is wrong and returns
 * `undefined` — so one read collects every problem in a unit rather than stopping
 * at the first, and no step needs a type assertion to proceed.
 */

import type { GlobalConfig } from "./config.ts";
import { readAgentConfig, readChatConfig, readGlobalConfig } from "./config.ts";
import { readSchema } from "./schema.ts";
import type { Layout, Parsed } from "./disk.ts";
import { at, badName, legal, placeAt, readParsed } from "./disk.ts";
import type { Checked } from "./problem.ts";
import { kindOf, ordered, problem } from "./problem.ts";
import type { Agent, Chat, Global, HomeProblem, McpServer, Problem } from "../types.ts";

/** One configuration-bounded file, whole and non-empty. */
export const readText = (
  out: Problem[],
  h: Layout,
  label: string,
  dir: string,
  name: Parsed,
): string | undefined => {
  const r = readParsed(h, dir, name);
  if (r.kind !== "text") {
    out.push(problem(label, kindOf(r, "file")));
    return undefined;
  }
  if (r.text.trim() === "") {
    out.push(problem(label, { _tag: "BadValue", key: "", expected: "non-empty", got: "" }));
    return undefined;
  }
  return r.text;
};

/** A parsed config, with every problem labelled by the file it came from. */
const parsed = <T>(
  out: Problem[],
  label: string,
  text: string,
  parse: (t: string) => Checked<T>,
): T | undefined => {
  const result = parse(text);
  if ("problems" in result) {
    out.push(...result.problems.map((d) => problem(label, d)));
    return undefined;
  }
  return result.value;
};

/** One reference, resolved or named as dangling. */
const resolve = <T extends { readonly name: string }>(
  out: Problem[],
  label: string,
  key: string,
  kind: "agent" | "mcpServer" | "model" | "source",
  to: string,
  among: readonly T[],
): T | undefined => {
  const hit = among.find((x) => x.name === to);
  if (hit !== undefined) return hit;
  out.push(problem(label, { _tag: "DanglingRef", key, to, kind, known: among.map((x) => x.name) }));
  return undefined;
};

const servers = (
  out: Problem[],
  label: string,
  named: readonly string[],
  among: readonly McpServer[],
): readonly McpServer[] =>
  named.flatMap((name) => resolve(out, label, "mcp", "mcpServer", name, among) ?? []);

/** Who Ambient is, and the global configuration. Every unit read needs both. */
export type Globals = { readonly identity: string; readonly config: GlobalConfig };

export const readGlobals = (out: Problem[], h: Layout): Globals | undefined => {
  const identity = readText(out, h, "identity.md", h.root, "identity.md");
  const text = readText(out, h, "config.yaml", h.root, "config.yaml");
  const config =
    text === undefined ? undefined : parsed(out, "config.yaml", text, readGlobalConfig);
  if (identity === undefined || config === undefined) return undefined;
  return { identity, config };
};

/**
 * The spine a chat and an agent share: a legal name, the globals, a prose file
 * and a config file, parsed. Which files and which parser are passed in; what
 * each unit then resolves stays with the unit.
 */
type Unit<C> = {
  readonly label: string;
  readonly configAt: string;
  readonly dir: string;
  readonly globals: Globals;
  readonly prose: string;
  readonly config: C;
};

const readUnit = <C>(
  out: Problem[],
  h: Layout,
  kind: "chats" | "agents",
  name: string,
  prose: Parsed,
  config: Parsed,
  parse: (t: string) => Checked<C>,
): Unit<C> | undefined => {
  const label = `${kind}/${name}`;
  if (!legal(name)) {
    out.push(problem(label, badName(name)));
    return undefined;
  }
  const dir = at(kind === "chats" ? h.chats : h.agents, name);
  const configAt = `${label}/${config}`;
  const globals = readGlobals(out, h);
  const proseText = readText(out, h, `${label}/${prose}`, dir, prose);
  const configText = readText(out, h, configAt, dir, config);
  if (globals === undefined || proseText === undefined || configText === undefined)
    return undefined;
  const value = parsed(out, configAt, configText, parse);
  if (value === undefined) return undefined;
  return { label, configAt, dir, globals, prose: proseText, config: value };
};

export const readAgent = (h: Layout, name: string): Agent | HomeProblem => {
  const out: Problem[] = [];
  const unit = readUnit(out, h, "agents", name, "SKILL.md", "agent.yaml", readAgentConfig);
  if (unit === undefined) return { problems: ordered(out) };
  const { config, configAt, globals } = unit;
  const profile = resolve(out, configAt, "model", "model", config.model, globals.config.profiles);
  const mcpServers = servers(out, configAt, config.mcp, globals.config.mcp);
  if (profile === undefined || out.length > 0) return { problems: ordered(out) };
  return {
    name,
    cwd: placeAt(unit.dir),
    skill: unit.prose,
    model: profile.model,
    thinking: config.thinking,
    mcpServers,
    scope: config.scope,
  };
};

export const readChat = (h: Layout, slug: string): Chat | HomeProblem => {
  const out: Problem[] = [];
  const unit = readUnit(out, h, "chats", slug, "mandate.md", "config.yaml", readChatConfig);
  if (unit === undefined) return { problems: ordered(out) };
  const { config, configAt, globals } = unit;
  const source = resolve(out, configAt, "source", "source", config.source, globals.config.sources);
  const mcpServers = servers(out, configAt, config.mcp, globals.config.mcp);
  const agents: Agent[] = [];
  for (const name of config.agents) {
    const agent = readAgent(h, name);
    if ("problems" in agent) out.push(...agent.problems);
    else agents.push(agent);
  }
  if (source === undefined || out.length > 0) return { problems: ordered(out) };
  return {
    slug,
    cwd: placeAt(unit.dir),
    identity: globals.identity,
    mandate: unit.prose,
    tools: config.tools,
    mcpServers,
    agents,
    source,
    peer: config.peer,
    model: globals.config.roles.speaker.model,
  };
};

export const readGlobal = (h: Layout): Global | HomeProblem => {
  const out: Problem[] = [];
  const globals = readGlobals(out, h);
  const text = readText(out, h, "schema.yaml", h.root, "schema.yaml");
  const schema = text === undefined ? undefined : parsed(out, "schema.yaml", text, readSchema);
  if (globals === undefined || schema === undefined) return { problems: ordered(out) };
  return {
    identity: globals.identity,
    sources: globals.config.sources,
    models: { profiles: globals.config.profiles, roles: globals.config.roles },
    schema,
  };
};
