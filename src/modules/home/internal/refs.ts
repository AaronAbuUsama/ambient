/**
 * The checks no single unit can see: a chat's `source`, `mcp` and `agents`, and
 * an agent's `model` and `mcp`, must resolve. ADR 001 invariant 6, and the reason
 * `home` is a unit rather than a bag of units.
 *
 * A file that will not read or parse is already named by its own item, so this
 * pass discards those problems rather than saying them twice.
 */

import { readAgentConfig, readChatConfig } from "./config.ts";
import type { Layout } from "./disk.ts";
import { at, legal, list } from "./disk.ts";
import { problem } from "./problem.ts";
import { readGlobals, readText } from "./read.ts";
import type { Problem } from "../types.ts";

type Kind = "agent" | "mcpServer" | "model" | "source";

type Ref = (key: string, to: string, kind: Kind, known: readonly string[]) => void;

const named = (h: Layout, dir: string): readonly string[] => (list(h, dir) ?? []).filter(legal);

export const crossRefs = (h: Layout): readonly Problem[] => {
  const globals = readGlobals([], h);
  if (globals === undefined) return [];
  const sources = globals.config.sources.map((s) => s.name);
  const servers = globals.config.mcp.map((m) => m.name);
  const profiles = globals.config.profiles.map((p) => p.name);
  const agents = named(h, h.agents);
  const out: Problem[] = [];

  /** Every reference is checked at the file that makes it, so `doctor` says where. */
  const refs =
    (label: string): Ref =>
    (key, to, kind, known) => {
      if (known.includes(to)) return;
      out.push(problem(label, { _tag: "DanglingRef", key, to, kind, known }));
    };

  for (const slug of named(h, h.chats)) {
    const label = `chats/${slug}/config.yaml`;
    const text = readText([], h, label, at(h.chats, slug), "config.yaml");
    const config = text === undefined ? undefined : readChatConfig(text);
    if (config === undefined || "problems" in config) continue;
    const ref = refs(label);
    ref("source", config.value.source, "source", sources);
    for (const s of config.value.mcp) ref("mcp", s, "mcpServer", servers);
    for (const a of config.value.agents) ref("agents", a, "agent", agents);
  }

  for (const name of agents) {
    const label = `agents/${name}/agent.yaml`;
    const text = readText([], h, label, at(h.agents, name), "agent.yaml");
    const config = text === undefined ? undefined : readAgentConfig(text);
    if (config === undefined || "problems" in config) continue;
    const ref = refs(label);
    ref("model", config.value.model, "model", profiles);
    for (const s of config.value.mcp) ref("mcp", s, "mcpServer", servers);
  }

  return out;
};
