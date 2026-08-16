/**
 * `home` — the Ambient home on disk: layout, validation, health, scaffolding.
 * The only module that knows a filesystem path (ADR 001).
 *
 * The unit is the handle. Three inhabitants — home, chat, agent — answer the same
 * three verbs. `init` and `doctor` are not a second interface; they are the root
 * unit's `converge()` and `plan()`, over one list of things that must be true.
 */

import {
  absolute,
  at,
  causeOf,
  isSqlite,
  list,
  look,
  mkdir,
  placeAt,
  readParsed,
  writeNew,
} from "./disk.ts";
import type { Found, Parsed, Place } from "./disk.ts";
import { readAgentConfig, readChatConfig, readGlobalConfig, readSchema } from "./config.ts";
import type { GlobalConfig, McpServer, ModelPolicy, Schema, Source, Thinking } from "./config.ts";
import { failure, ordered, problem } from "./problem.ts";
import type { Checked, HomeProblem, Problem, ProblemDetail } from "./problem.ts";
import * as template from "./templates.ts";

export type { Place } from "./disk.ts";
export type { HomeProblem, Problem, ProblemDetail } from "./problem.ts";
export type {
  FieldForm,
  McpServer,
  ModelPolicy,
  ModelProfile,
  Role,
  Schema,
  SchemaField,
  SchemaType,
  Source,
  Thinking,
} from "./config.ts";
export { describe } from "./problem.ts";

// ── the interface ─────────────────────────────────────────────────────

export type HomeDeps = {
  /**
   * Runs `ok init` in `dir`, creating it. Injected — home never spawns a process.
   * Resolving with a non-empty string means it failed, and the string says why.
   */
  initKnowledge(dir: string): Promise<string | void>;
};

export type Global = {
  readonly identity: string;
  readonly sources: readonly Source[];
  readonly models: ModelPolicy;
  readonly schema: Schema;
};

export type Agent = {
  readonly name: string;
  readonly cwd: Place;
  readonly skill: string;
  /** Already resolved to a concrete model id. */
  readonly model: string;
  readonly thinking: Thinking;
  readonly mcpServers: readonly McpServer[];
  readonly scope: string;
};

export type Chat = {
  readonly slug: string;
  readonly cwd: Place;
  /** Global `identity.md` — NEVER optional. Local adds to it, never replaces it. */
  readonly identity: string;
  readonly mandate: string;
  readonly tools: readonly string[];
  readonly mcpServers: readonly McpServer[];
  readonly agents: readonly Agent[];
  readonly source: Source;
  readonly peer: string;
  readonly model: string;
};

export type ChatHandle = {
  readonly slug: string;
  readonly cwd: Place;
  readonly transcript: Place;
  readonly media: Place;
  readonly now: Place;
  read(): Chat | HomeProblem;
  plan(): readonly Problem[];
  converge(): Promise<readonly Problem[]>;
};

export type AgentHandle = {
  readonly name: string;
  readonly cwd: Place;
  read(): Agent | HomeProblem;
  plan(): readonly Problem[];
  converge(): Promise<readonly Problem[]>;
};

export type Home = {
  /** Display only. */
  readonly root: string;
  readonly blobs: Place;
  readonly db: Place;

  read(): Global | HomeProblem;
  chat(slug: string): ChatHandle;
  agent(name: string): AgentHandle;
  chats(): readonly ChatHandle[];
  agents(): readonly AgentHandle[];

  /** `doctor`. `[]` means healthy. */
  plan(): readonly Problem[];
  /** `init`. `[]` means healthy after repair. */
  converge(): Promise<readonly Problem[]>;
};

// ── implementation ────────────────────────────────────────────────────

/** Names are a trust boundary. `..` must never become a path. */
const LEGAL = /^[a-z0-9][a-z0-9-]{0,63}$/;

const ROOT_ENTRIES = [
  "identity.md",
  "config.yaml",
  "schema.yaml",
  ".gitignore",
  "knowledge",
  "blobs",
  "chats",
  "agents",
  "state.db",
] as const;
const CHAT_ENTRIES = [
  "config.yaml",
  "mandate.md",
  "skills",
  "transcript.jsonl",
  "media",
  "now.md",
] as const;
const AGENT_ENTRIES = ["agent.yaml", "SKILL.md"] as const;

/** One item of the list. `plan` runs `check`; `converge` runs `make` then `check`. */
type Ensure = {
  readonly at: string;
  readonly make?: () => Promise<string | void>;
  readonly check: () => readonly Problem[];
};

type Text = { readonly text: string } | { readonly problems: readonly Problem[] };

const kindOf = (f: Found, expected: "file" | "directory"): ProblemDetail => {
  switch (f.kind) {
    case "absent":
      return { _tag: "Missing" };
    case "escapes":
      return { _tag: "Escapes" };
    case "unreadable":
      return { _tag: "Unreadable", cause: f.cause };
    default:
      return { _tag: "WrongKind", expected };
  }
};

const badName = (got: string): ProblemDetail => ({
  _tag: "BadName",
  got,
  expected: LEGAL.source,
});

const details = <T>(c: Checked<T>): readonly ProblemDetail[] => ("problems" in c ? c.problems : []);

/** `config.yml` beside `config.yaml`, `mandate.MD` beside `mandate.md`. */
const normal = (name: string): string => name.toLowerCase().replace(/\.yml$/, ".yaml");

export const openHome = (root: string, deps: HomeDeps): Home | HomeProblem => {
  const abs = absolute(root);
  const found = look(abs, abs);
  if (found.kind !== "absent" && found.kind !== "dir") {
    return { problems: [problem(".", kindOf(found, "directory"))] };
  }

  const chatsDir = at(abs, "chats");
  const agentsDir = at(abs, "agents");
  const knowledgeDir = at(abs, "knowledge");
  const blobsDir = at(abs, "blobs");
  const dbFile = at(abs, "state.db");

  // ── reading ─────────────────────────────────────────────────────────

  const textOf = (label: string, dir: string, name: Parsed): Text => {
    const r = readParsed(abs, dir, name);
    if (r.kind !== "text") return { problems: [problem(label, kindOf(r, "file"))] };
    if (r.text.trim() === "") {
      return {
        problems: [problem(label, { _tag: "BadValue", key: "", expected: "non-empty", got: "" })],
      };
    }
    return { text: r.text };
  };

  const globalParts = ():
    | { readonly identity: string; readonly config: GlobalConfig }
    | { readonly problems: readonly Problem[] } => {
    const identity = textOf("identity.md", abs, "identity.md");
    const source = textOf("config.yaml", abs, "config.yaml");
    if ("problems" in identity || "problems" in source) {
      return {
        problems: [
          ...("problems" in identity ? identity.problems : []),
          ...("problems" in source ? source.problems : []),
        ],
      };
    }
    const config = readGlobalConfig(source.text);
    if ("problems" in config) {
      return { problems: config.problems.map((d) => problem("config.yaml", d)) };
    }
    return { identity: identity.text, config: config.value };
  };

  const readAgent = (name: string): Agent | HomeProblem => {
    const label = `agents/${name}`;
    if (!LEGAL.test(name)) return { problems: [problem(label, badName(name))] };
    const dir = at(agentsDir, name);
    const parts = globalParts();
    const skill = textOf(`${label}/SKILL.md`, dir, "SKILL.md");
    const source = textOf(`${label}/agent.yaml`, dir, "agent.yaml");
    const problems: Problem[] = [
      ...("problems" in parts ? parts.problems : []),
      ...("problems" in skill ? skill.problems : []),
      ...("problems" in source ? source.problems : []),
    ];
    if ("problems" in parts || "problems" in skill || "problems" in source) {
      return { problems: [problems[0], ...problems.slice(1)] };
    }
    const config = readAgentConfig(source.text);
    if ("problems" in config) {
      const mapped = config.problems.map((d) => problem(`${label}/agent.yaml`, d));
      return { problems: [mapped[0], ...mapped.slice(1)] };
    }
    const configAt = `${label}/agent.yaml`;
    const profile = parts.config.models.profiles.find((p) => p.name === config.value.model);
    const dangling: Problem[] = [];
    if (profile === undefined) {
      dangling.push(
        problem(configAt, {
          _tag: "DanglingRef",
          key: "model",
          to: config.value.model,
          kind: "model",
          known: parts.config.models.profiles.map((p) => p.name),
        }),
      );
    }
    const servers: McpServer[] = [];
    for (const server of config.value.mcp) {
      const hit = parts.config.mcp.find((m) => m.name === server);
      if (hit === undefined) {
        dangling.push(
          problem(configAt, {
            _tag: "DanglingRef",
            key: "mcp",
            to: server,
            kind: "mcpServer",
            known: parts.config.mcp.map((m) => m.name),
          }),
        );
      } else servers.push(hit);
    }
    if (profile === undefined) {
      const all = ordered(dangling);
      return { problems: [all[0], ...all.slice(1)] };
    }
    const failed = failure(ordered(dangling));
    if (failed !== undefined) return failed;
    return {
      name,
      cwd: placeAt(dir),
      skill: skill.text,
      model: profile.model,
      thinking: config.value.thinking,
      mcpServers: servers,
      scope: config.value.scope,
    };
  };

  const readChat = (slug: string): Chat | HomeProblem => {
    const label = `chats/${slug}`;
    if (!LEGAL.test(slug)) return { problems: [problem(label, badName(slug))] };
    const dir = at(chatsDir, slug);
    const parts = globalParts();
    const mandate = textOf(`${label}/mandate.md`, dir, "mandate.md");
    const source = textOf(`${label}/config.yaml`, dir, "config.yaml");
    const problems: Problem[] = [
      ...("problems" in parts ? parts.problems : []),
      ...("problems" in mandate ? mandate.problems : []),
      ...("problems" in source ? source.problems : []),
    ];
    if ("problems" in parts || "problems" in mandate || "problems" in source) {
      return { problems: [problems[0], ...problems.slice(1)] };
    }
    const config = readChatConfig(source.text);
    if ("problems" in config) {
      const mapped = config.problems.map((d) => problem(`${label}/config.yaml`, d));
      return { problems: [mapped[0], ...mapped.slice(1)] };
    }
    const configAt = `${label}/config.yaml`;
    const dangling: Problem[] = [];
    const bound = parts.config.sources.find((s) => s.name === config.value.source);
    if (bound === undefined) {
      dangling.push(
        problem(configAt, {
          _tag: "DanglingRef",
          key: "source",
          to: config.value.source,
          kind: "source",
          known: parts.config.sources.map((s) => s.name),
        }),
      );
    }
    const servers: McpServer[] = [];
    for (const name of config.value.mcp) {
      const hit = parts.config.mcp.find((m) => m.name === name);
      if (hit === undefined) {
        dangling.push(
          problem(configAt, {
            _tag: "DanglingRef",
            key: "mcp",
            to: name,
            kind: "mcpServer",
            known: parts.config.mcp.map((m) => m.name),
          }),
        );
      } else servers.push(hit);
    }
    const agents: Agent[] = [];
    for (const name of config.value.agents) {
      const agent = readAgent(name);
      if ("problems" in agent) dangling.push(...agent.problems);
      else agents.push(agent);
    }
    if (bound === undefined) {
      const all = ordered(dangling);
      return { problems: [all[0], ...all.slice(1)] };
    }
    const failed = failure(ordered(dangling));
    if (failed !== undefined) return failed;
    return {
      slug,
      cwd: placeAt(dir),
      identity: parts.identity,
      mandate: mandate.text,
      tools: config.value.tools,
      mcpServers: servers,
      agents,
      source: bound,
      peer: config.value.peer,
      model: parts.config.models.roles.speaker.model,
    };
  };

  // ── the list ────────────────────────────────────────────────────────

  const dirItem = (label: string, dirAbs: string): Ensure => ({
    at: label,
    make: async () => {
      if (look(abs, dirAbs).kind === "absent") await mkdir(dirAbs);
    },
    check: () => {
      const f = look(abs, dirAbs);
      return f.kind === "dir" ? [] : [problem(label, kindOf(f, "directory"))];
    },
  });

  const writeItem = (label: string, dir: string, name: string, body: string): Ensure => ({
    at: label,
    make: async () => {
      if (look(abs, at(dir, name)).kind === "absent") await writeNew(dir, name, body);
    },
    check: () => {
      const f = look(abs, at(dir, name));
      return f.kind === "file" ? [] : [problem(label, kindOf(f, "file"))];
    },
  });

  const fileItem = (
    label: string,
    dir: string,
    name: Parsed,
    body: string,
    validate?: (text: string) => readonly ProblemDetail[],
  ): Ensure => ({
    ...writeItem(label, dir, name, body),
    check: () => {
      const r = textOf(label, dir, name);
      return "problems" in r
        ? r.problems
        : (validate?.(r.text) ?? []).map((d) => problem(label, d));
    },
  });

  const namesItem = (label: string, dirAbs: string, declared: readonly string[]): Ensure => ({
    at: label,
    check: () => {
      const entries = list(abs, dirAbs);
      if (entries === undefined) return [];
      const problems: Problem[] = [];
      for (const entry of entries) {
        if (declared.includes(entry)) continue;
        const near = declared.find((d) => normal(d) === normal(entry));
        if (near !== undefined) {
          problems.push(
            problem(`${label}${entry}`, { _tag: "BadName", got: entry, expected: `"${near}"` }),
          );
        }
      }
      return problems;
    },
  });

  /** Slug legality, and the case collision that is invisible on macOS and breaks on Linux. */
  const childrenItem = (label: string, dirAbs: string): Ensure => ({
    at: label,
    check: () => {
      const entries = list(abs, dirAbs);
      if (entries === undefined) return [];
      const problems: Problem[] = [];
      const folded = new Map<string, string>();
      for (const entry of entries) {
        if (!LEGAL.test(entry)) problems.push(problem(`${label}${entry}`, badName(entry)));
        const first = folded.get(entry.toLowerCase());
        if (first === undefined) folded.set(entry.toLowerCase(), entry);
        else {
          problems.push(
            problem(`${label}${entry}`, {
              _tag: "BadName",
              got: entry,
              expected: `a name that does not collide with "${first}" when case is ignored`,
            }),
          );
        }
      }
      return problems;
    },
  });

  const knowledgeItem: Ensure = {
    at: "knowledge/",
    make: async () => {
      if (look(abs, knowledgeDir).kind !== "absent") return;
      const failed = await deps.initKnowledge(knowledgeDir);
      return typeof failed === "string" && failed !== "" ? failed : undefined;
    },
    check: () => {
      const f = look(abs, knowledgeDir);
      return f.kind === "dir" ? [] : [problem("knowledge/", kindOf(f, "directory"))];
    },
  };

  /** Optional: SKELETON ships no `work`, so a healthy home has no database. */
  const dbItem: Ensure = {
    at: "state.db",
    check: () => {
      const f = look(abs, dbFile);
      if (f.kind === "absent") return [];
      if (f.kind !== "file") return [problem("state.db", kindOf(f, "file"))];
      const magic = isSqlite(dbFile);
      if (magic === true) return [];
      return [
        problem(
          "state.db",
          magic === false
            ? { _tag: "BadValue", key: "", expected: "a SQLite database", got: "something else" }
            : { _tag: "Unreadable", cause: magic.cause },
        ),
      ];
    },
  };

  const slugs = (): readonly string[] => list(abs, chatsDir) ?? [];
  const names = (): readonly string[] => list(abs, agentsDir) ?? [];

  const chatItems = (slug: string): readonly Ensure[] => {
    const label = `chats/${slug}`;
    if (!LEGAL.test(slug)) {
      return [{ at: label, check: () => [problem(label, badName(slug))] }];
    }
    const dir = at(chatsDir, slug);
    return [
      dirItem(".", abs),
      dirItem("chats/", chatsDir),
      dirItem(`${label}/`, dir),
      fileItem(`${label}/config.yaml`, dir, "config.yaml", template.CHAT_CONFIG, (t) =>
        details(readChatConfig(t)),
      ),
      fileItem(`${label}/mandate.md`, dir, "mandate.md", template.MANDATE(slug)),
      namesItem(`${label}/`, dir, CHAT_ENTRIES),
    ];
  };

  const agentItems = (name: string): readonly Ensure[] => {
    const label = `agents/${name}`;
    if (!LEGAL.test(name)) {
      return [{ at: label, check: () => [problem(label, badName(name))] }];
    }
    const dir = at(agentsDir, name);
    return [
      dirItem(".", abs),
      dirItem("agents/", agentsDir),
      dirItem(`${label}/`, dir),
      fileItem(`${label}/agent.yaml`, dir, "agent.yaml", template.AGENT_CONFIG, (t) =>
        details(readAgentConfig(t)),
      ),
      fileItem(`${label}/SKILL.md`, dir, "SKILL.md", template.SKILL(name)),
      namesItem(`${label}/`, dir, AGENT_ENTRIES),
    ];
  };

  /**
   * The checks no single unit can see: a chat's `source`, `mcp` and `agents`, and
   * an agent's `model` and `mcp`, must resolve. ADR 001 invariant 6.
   */
  const crossItem: Ensure = {
    at: "",
    check: () => {
      const parts = globalParts();
      if ("problems" in parts) return [];
      const sources = parts.config.sources.map((s) => s.name);
      const servers = parts.config.mcp.map((m) => m.name);
      const profiles = parts.config.models.profiles.map((p) => p.name);
      const existing = names().filter((n) => LEGAL.test(n));
      const problems: Problem[] = [];

      const ref = (
        label: string,
        key: string,
        to: string,
        kind: "agent" | "mcpServer" | "model" | "source",
        known: readonly string[],
      ): void => {
        if (known.includes(to)) return;
        problems.push(problem(label, { _tag: "DanglingRef", key, to, kind, known }));
      };

      for (const slug of slugs()) {
        if (!LEGAL.test(slug)) continue;
        const label = `chats/${slug}/config.yaml`;
        const source = textOf(label, at(chatsDir, slug), "config.yaml");
        if ("problems" in source) continue;
        const config = readChatConfig(source.text);
        if ("problems" in config) continue;
        ref(label, "source", config.value.source, "source", sources);
        for (const server of config.value.mcp) ref(label, "mcp", server, "mcpServer", servers);
        for (const agent of config.value.agents) ref(label, "agents", agent, "agent", existing);
      }

      for (const name of existing) {
        const label = `agents/${name}/agent.yaml`;
        const source = textOf(label, at(agentsDir, name), "agent.yaml");
        if ("problems" in source) continue;
        const config = readAgentConfig(source.text);
        if ("problems" in config) continue;
        ref(label, "model", config.value.model, "model", profiles);
        for (const server of config.value.mcp) ref(label, "mcp", server, "mcpServer", servers);
      }

      return problems;
    },
  };

  const homeItems = (): readonly Ensure[] => [
    dirItem(".", abs),
    fileItem("identity.md", abs, "identity.md", template.IDENTITY),
    fileItem("config.yaml", abs, "config.yaml", template.CONFIG, (t) =>
      details(readGlobalConfig(t)),
    ),
    fileItem("schema.yaml", abs, "schema.yaml", template.SCHEMA, (t) => details(readSchema(t))),
    writeItem(".gitignore", abs, ".gitignore", template.GITIGNORE),
    knowledgeItem,
    dirItem("blobs/", blobsDir),
    dirItem("chats/", chatsDir),
    dirItem("agents/", agentsDir),
    dbItem,
    namesItem("", abs, ROOT_ENTRIES),
    childrenItem("chats/", chatsDir),
    childrenItem("agents/", agentsDir),
    ...slugs().flatMap(chatItems),
    ...names().flatMap(agentItems),
    crossItem,
  ];

  // ── the two verbs ───────────────────────────────────────────────────

  const planned = (items: readonly Ensure[]): readonly Problem[] =>
    ordered(items.flatMap((i) => i.check()));

  const converged = async (items: readonly Ensure[]): Promise<readonly Problem[]> => {
    const failures: Problem[] = [];
    for (const item of items) {
      if (item.make === undefined) continue;
      const failed = await item.make().catch(causeOf);
      if (typeof failed === "string") {
        failures.push(problem(item.at, { _tag: "Unreadable", cause: failed }));
      }
    }
    return ordered([...failures, ...items.flatMap((i) => i.check())]);
  };

  // ── the handles ─────────────────────────────────────────────────────

  const chatHandle = (slug: string): ChatHandle => {
    const dir = at(chatsDir, slug);
    const grant = (name?: string): Place => {
      if (!LEGAL.test(slug)) {
        throw new Error(`chats/${slug}: illegal slug — no Place exists for it`);
      }
      return placeAt(name === undefined ? dir : at(dir, name));
    };
    return {
      slug,
      get cwd() {
        return grant();
      },
      get transcript() {
        return grant("transcript.jsonl");
      },
      get media() {
        return grant("media");
      },
      get now() {
        return grant("now.md");
      },
      read: () => readChat(slug),
      plan: () => planned(chatItems(slug)),
      converge: () => converged(chatItems(slug)),
    };
  };

  const agentHandle = (name: string): AgentHandle => ({
    name,
    get cwd() {
      if (!LEGAL.test(name)) {
        throw new Error(`agents/${name}: illegal name — no Place exists for it`);
      }
      return placeAt(at(agentsDir, name));
    },
    read: () => readAgent(name),
    plan: () => planned(agentItems(name)),
    converge: () => converged(agentItems(name)),
  });

  return {
    root: abs,
    blobs: placeAt(blobsDir),
    db: placeAt(dbFile),

    read: () => {
      const parts = globalParts();
      const source = textOf("schema.yaml", abs, "schema.yaml");
      if ("problems" in parts || "problems" in source) {
        const problems = [
          ...("problems" in parts ? parts.problems : []),
          ...("problems" in source ? source.problems : []),
        ];
        return { problems: [problems[0], ...problems.slice(1)] };
      }
      const schema = readSchema(source.text);
      if ("problems" in schema) {
        const mapped = schema.problems.map((d) => problem("schema.yaml", d));
        return { problems: [mapped[0], ...mapped.slice(1)] };
      }
      return {
        identity: parts.identity,
        sources: parts.config.sources,
        models: parts.config.models,
        schema: schema.value,
      };
    },

    chat: chatHandle,
    agent: agentHandle,
    chats: () => slugs().map(chatHandle),
    agents: () => names().map(agentHandle),

    plan: () => planned(homeItems()),
    converge: () => converged(homeItems()),
  };
};
