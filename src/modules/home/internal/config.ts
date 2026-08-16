/**
 * The three config schemas and the ontology vocabulary, validated fail-closed:
 * an unknown key is a named problem, never a silent default and never a dropped
 * field. Nothing here knows a path — text in, a value or a list of problems out.
 */

import type { Checked } from "./problem.ts";
import type { Out } from "./yaml.ts";
import {
  done,
  need,
  oneOf,
  parseYaml,
  record,
  text,
  textList,
  textMap,
  unknownKeys,
} from "./yaml.ts";
import type { McpServer, ModelProfile, Role, Source, Thinking } from "../types.ts";

/** The global `config.yaml`, before cross-file references are resolved. */
export type GlobalConfig = {
  readonly sources: readonly Source[];
  readonly mcp: readonly McpServer[];
  readonly profiles: readonly ModelProfile[];
  readonly roles: Readonly<Record<Role, ModelProfile>>;
};

export type ChatConfig = {
  readonly source: string;
  readonly peer: string;
  readonly tools: readonly string[];
  readonly mcp: readonly string[];
  readonly agents: readonly string[];
};

export type AgentConfig = {
  readonly model: string;
  readonly thinking: Thinking;
  readonly mcp: readonly string[];
  readonly scope: string;
};

const THINKING = ["off", "low", "medium", "high"] as const satisfies readonly Thinking[];
const KINDS = ["whatsapp", "email"] as const;
const MODES = ["ingest", "speak"] as const;
const ROLES = ["default", "speaker", "digest", "media", "synthesis"] as const;

const SOURCE_KEYS = ["kind", "mode", "allow"] as const;
const MCP_KEYS = ["command", "args", "env"] as const;
const MODEL_KEYS = ["provider", "baseUrl", "model", "thinking"] as const;
const GLOBAL_KEYS = ["sources", "mcp", "models", "roles"] as const;
const CHAT_KEYS = ["source", "peer", "tools", "mcp", "agents"] as const;
const AGENT_KEYS = ["model", "thinking", "mcp", "scope"] as const;

const readSources = (out: Out, root: Record<string, unknown>): readonly Source[] => {
  const sources: Source[] = [];
  const rec = need(out, "", root, "sources", (v) => record(out, "sources", v));
  for (const [name, v] of Object.entries(rec ?? {})) {
    const at = `sources.${name}`;
    const r = record(out, at, v);
    if (r === undefined) continue;
    unknownKeys(out, `${at}.`, r, SOURCE_KEYS);
    const kind = need(out, `${at}.`, r, "kind", (x) => oneOf(out, `${at}.kind`, x, KINDS));
    const mode = need(out, `${at}.`, r, "mode", (x) => oneOf(out, `${at}.mode`, x, MODES));
    const allow = need(out, `${at}.`, r, "allow", (x) => textList(out, `${at}.allow`, x));
    if (kind !== undefined && mode !== undefined && allow !== undefined) {
      sources.push({ name, kind, mode, allow });
    }
  }
  return sources;
};

const readServers = (out: Out, root: Record<string, unknown>): readonly McpServer[] => {
  const servers: McpServer[] = [];
  const rec = need(out, "", root, "mcp", (v) => record(out, "mcp", v));
  for (const [name, v] of Object.entries(rec ?? {})) {
    const at = `mcp.${name}`;
    const r = record(out, at, v);
    if (r === undefined) continue;
    unknownKeys(out, `${at}.`, r, MCP_KEYS);
    const command = need(out, `${at}.`, r, "command", (x) => text(out, `${at}.command`, x));
    const args = "args" in r ? textList(out, `${at}.args`, r.args) : [];
    const env = "env" in r ? textMap(out, `${at}.env`, r.env) : {};
    if (command !== undefined && args !== undefined && env !== undefined) {
      servers.push({ name, command, args, env });
    }
  }
  return servers;
};

const readProfiles = (out: Out, root: Record<string, unknown>): readonly ModelProfile[] => {
  const profiles: ModelProfile[] = [];
  const rec = need(out, "", root, "models", (v) => record(out, "models", v));
  for (const [name, v] of Object.entries(rec ?? {})) {
    const at = `models.${name}`;
    const r = record(out, at, v);
    if (r === undefined) continue;
    unknownKeys(out, `${at}.`, r, MODEL_KEYS);
    const provider = need(out, `${at}.`, r, "provider", (x) => text(out, `${at}.provider`, x));
    const model = need(out, `${at}.`, r, "model", (x) => text(out, `${at}.model`, x));
    const thinking = need(out, `${at}.`, r, "thinking", (x) =>
      oneOf(out, `${at}.thinking`, x, THINKING),
    );
    const baseUrl = "baseUrl" in r ? text(out, `${at}.baseUrl`, r.baseUrl) : undefined;
    if (provider !== undefined && model !== undefined && thinking !== undefined) {
      profiles.push({ name, provider, model, thinking, baseUrl });
    }
  }
  return profiles;
};

/** Roles are resolved here, so a role never hands out a name that does not exist. */
const readRoles = (
  out: Out,
  root: Record<string, unknown>,
  profiles: readonly ModelProfile[],
): Readonly<Record<Role, ModelProfile>> | undefined => {
  const known = profiles.map((p) => p.name);
  const roles: Partial<Record<Role, ModelProfile>> = {};
  const rec = need(out, "", root, "roles", (v) => record(out, "roles", v));
  if (rec !== undefined) {
    unknownKeys(out, "roles.", rec, ROLES);
    for (const role of ROLES) {
      const name = need(out, "roles.", rec, role, (x) => text(out, `roles.${role}`, x));
      if (name === undefined) continue;
      const hit = profiles.find((p) => p.name === name);
      if (hit === undefined) {
        out.push({ _tag: "DanglingRef", key: `roles.${role}`, to: name, kind: "model", known });
      } else roles[role] = hit;
    }
  }
  const { default: fallback, speaker, digest, media, synthesis } = roles;
  if (
    fallback === undefined ||
    speaker === undefined ||
    digest === undefined ||
    media === undefined ||
    synthesis === undefined
  ) {
    return undefined;
  }
  return { default: fallback, speaker, digest, media, synthesis };
};

export const readGlobalConfig = (src: string): Checked<GlobalConfig> => {
  const parsed = parseYaml(src);
  if ("problems" in parsed) return parsed;
  const out: Out = [];
  const root = record(out, "", parsed.value);
  if (root === undefined) return { problems: out };
  unknownKeys(out, "", root, GLOBAL_KEYS);
  const sources = readSources(out, root);
  const mcp = readServers(out, root);
  const profiles = readProfiles(out, root);
  const roles = readRoles(out, root, profiles);
  return done(out, roles === undefined ? undefined : { sources, mcp, profiles, roles });
};

export const readChatConfig = (src: string): Checked<ChatConfig> => {
  const parsed = parseYaml(src);
  if ("problems" in parsed) return parsed;
  const out: Out = [];
  const r = record(out, "", parsed.value);
  if (r === undefined) return { problems: out };
  unknownKeys(out, "", r, CHAT_KEYS);
  const source = need(out, "", r, "source", (v) => text(out, "source", v));
  const peer = need(out, "", r, "peer", (v) => text(out, "peer", v));
  const tools = need(out, "", r, "tools", (v) => textList(out, "tools", v));
  const mcp = need(out, "", r, "mcp", (v) => textList(out, "mcp", v));
  const agents = need(out, "", r, "agents", (v) => textList(out, "agents", v));
  const complete =
    source !== undefined &&
    peer !== undefined &&
    tools !== undefined &&
    mcp !== undefined &&
    agents !== undefined;
  return done(out, complete ? { source, peer, tools, mcp, agents } : undefined);
};

export const readAgentConfig = (src: string): Checked<AgentConfig> => {
  const parsed = parseYaml(src);
  if ("problems" in parsed) return parsed;
  const out: Out = [];
  const r = record(out, "", parsed.value);
  if (r === undefined) return { problems: out };
  unknownKeys(out, "", r, AGENT_KEYS);
  const model = need(out, "", r, "model", (v) => text(out, "model", v));
  const thinking = need(out, "", r, "thinking", (v) => oneOf(out, "thinking", v, THINKING));
  const mcp = need(out, "", r, "mcp", (v) => textList(out, "mcp", v));
  const scope = need(out, "", r, "scope", (v) => text(out, "scope", v));
  const complete =
    model !== undefined && thinking !== undefined && mcp !== undefined && scope !== undefined;
  return done(out, complete ? { model, thinking, mcp, scope } : undefined);
};
