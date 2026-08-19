/**
 * The checks no single unit can see: a chat's `source`, `mcp` and `agents`, and
 * an agent's `model` and `mcp`, must resolve. ADR 001 invariant 6, and the reason
 * `home` is a unit rather than a bag of units.
 *
 * A file that will not read or parse is already named by its own item, so this
 * pass discards those problems rather than saying them twice.
 *
 * The shape is the same for both kinds of file: read it, list the references it
 * makes, keep the ones that resolve to nothing. Only the middle step differs, so
 * only the middle step is written twice.
 */

import { readAgentConfig, readChatConfig } from "./config.ts";
import type { Layout } from "./disk.ts";
import { at, entries, legal } from "./disk.ts";
import { problem } from "./problem.ts";
import { readGlobals, readText } from "./read.ts";
import type { Problem } from "../types.ts";

type Kind = "agent" | "mcpServer" | "model" | "source";

/** One reference a config file makes, and the names it could have resolved to. */
type Reference = {
  readonly key: string;
  readonly to: string;
  readonly kind: Kind;
  readonly known: readonly string[];
};

/** Every name a reference is allowed to point at, gathered once. */
type Known = {
  readonly sources: readonly string[];
  readonly servers: readonly string[];
  readonly profiles: readonly string[];
  readonly agents: readonly string[];
};

const named = (h: Layout, dir: string): readonly string[] => entries(h, dir).filter(legal);

/**
 * Every reference is reported at the file that makes it, so `doctor` says where.
 *
 * A reference that resolves produces nothing. That is the only test here, and it
 * is why `known` travels with the reference rather than being looked up again.
 */
const dangling = (label: string, references: readonly Reference[]): readonly Problem[] =>
  references
    .filter((reference) => !reference.known.includes(reference.to))
    .map((reference) => problem(label, { _tag: "DanglingRef", ...reference }));

/** A chat points at one Source, any number of MCP servers, and any number of Agents. */
const chatProblems = (h: Layout, known: Known): readonly Problem[] =>
  named(h, h.chats).flatMap((slug) => {
    const label = `chats/${slug}/config.yaml`;
    const text = readText([], h, label, at(h.chats, slug), "config.yaml");
    const config = text === undefined ? undefined : readChatConfig(text);
    if (config === undefined || "problems" in config) return [];
    return dangling(label, [
      { key: "source", to: config.value.source, kind: "source", known: known.sources },
      ...config.value.mcp.map(
        (server): Reference => ({
          key: "mcp",
          to: server,
          kind: "mcpServer",
          known: known.servers,
        }),
      ),
      ...config.value.agents.map(
        (agent): Reference => ({ key: "agents", to: agent, kind: "agent", known: known.agents }),
      ),
    ]);
  });

/** An Agent points at one model profile and any number of MCP servers. */
const agentProblems = (h: Layout, known: Known): readonly Problem[] =>
  known.agents.flatMap((name) => {
    const label = `agents/${name}/agent.yaml`;
    const text = readText([], h, label, at(h.agents, name), "agent.yaml");
    const config = text === undefined ? undefined : readAgentConfig(text);
    if (config === undefined || "problems" in config) return [];
    return dangling(label, [
      { key: "model", to: config.value.model, kind: "model", known: known.profiles },
      ...config.value.mcp.map(
        (server): Reference => ({
          key: "mcp",
          to: server,
          kind: "mcpServer",
          known: known.servers,
        }),
      ),
    ]);
  });

export const crossRefs = (h: Layout): readonly Problem[] => {
  const globals = readGlobals([], h);
  if (globals === undefined) return [];

  const known: Known = {
    sources: globals.config.sources.map((source) => source.name),
    servers: globals.config.mcp.map((server) => server.name),
    profiles: globals.config.profiles.map((profile) => profile.name),
    agents: named(h, h.agents),
  };

  return [...chatProblems(h, known), ...agentProblems(h, known)];
};
