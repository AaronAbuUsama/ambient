/**
 * `home` — the Ambient home on disk: layout, validation, health, scaffolding.
 * The only module that knows a filesystem path (ADR 001).
 *
 * THE interface. Read this file alone and you know what `home` is. `service.ts`
 * implements it; `internal/` is what only `home` knows.
 *
 * The unit is the handle. Four inhabitants — home, chat, agent, source — answer
 * the same verbs. `init` and `doctor` are not a second interface; they are the
 * root unit's `converge()` and `plan()`, over one list of things that must be true.
 *
 * **Every way `home` can fail is a `ProblemDetail` below.** Nothing in this module
 * throws: a failure is a value, so the interface cannot lie about how it fails and
 * an Effect `E` channel is already written. Narrow anything that can fail with
 * `"problems" in result`.
 */

import type { Describe } from "~/modules/failure/types.ts";

// ── how a path escapes ────────────────────────────────────────────────

declare const place: unique symbol;

/**
 * An absolute path inside the home. Home made it, checked its kind, and will not
 * move it. Branded, so no caller fabricates one from a string, and reaching the
 * string is the visible act `.path`.
 *
 * `home` emits a `Place` only when the consumer hands it to something outside our
 * codebase. It never emits a path our own code will `join` onto.
 */
export type Place = { readonly path: string; readonly [place]: true };

// ── errors: one vocabulary, everywhere ────────────────────────────────

export type ProblemDetail =
  | { readonly _tag: "Missing" }
  | { readonly _tag: "WrongKind"; readonly expected: "file" | "directory" }
  /** A symlink here leaves the home. */
  | { readonly _tag: "Escapes" }
  /** The filesystem refused: a read, a listing or a write failed. `cause` is the OS message. */
  | { readonly _tag: "Unreadable"; readonly cause: string }
  | {
      readonly _tag: "Malformed";
      readonly line: number;
      readonly column?: number;
      readonly detail: string;
    }
  | { readonly _tag: "UnknownKey"; readonly key: string; readonly known: readonly string[] }
  | { readonly _tag: "MissingKey"; readonly key: string }
  | {
      readonly _tag: "BadValue";
      readonly key: string;
      readonly expected: string;
      readonly got: string;
    }
  | { readonly _tag: "BadName"; readonly got: string; readonly expected: string }
  | {
      readonly _tag: "DanglingRef";
      readonly key: string;
      readonly to: string;
      readonly kind: "agent" | "mcpServer" | "model" | "source";
      readonly known: readonly string[];
    };

/** `at` is a home-relative label — deliberately not a usable path. It is for humans. */
export type Problem = { readonly at: string; readonly detail: ProblemDetail };

/** Why `home` said no — to a read, or to a `Place`. Narrow with `"problems" in result`. */
export type HomeProblem = { readonly problems: readonly Problem[] };

// ── the values a unit reads as ────────────────────────────────────────

export type Thinking = "off" | "low" | "medium" | "high";
export type Role = "default" | "speaker" | "digest" | "media" | "synthesis";

export type Source = {
  readonly name: string;
  readonly kind: "whatsapp" | "email";
  readonly mode: "ingest" | "speak";
  /** Opt-in per conversation; empty means nothing. */
  readonly allow: readonly string[];
};

export type McpServer = {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
};

export type ModelProfile = {
  readonly name: string;
  readonly provider: string;
  readonly baseUrl?: string;
  readonly model: string;
  readonly thinking: Thinking;
};

export type ModelPolicy = {
  readonly profiles: readonly ModelProfile[];
  /** Already resolved — a role never hands out a name that does not exist. */
  readonly roles: Readonly<Record<Role, ModelProfile>>;
};

/** The closed field vocabulary. Users add types; users cannot add field forms. */
export type FieldForm =
  | { readonly form: "text" | "text[]" | "ref" | "ref[]" | "date" }
  | { readonly form: "enum"; readonly of: readonly string[] };

export type SchemaField = {
  readonly name: string;
  readonly type: FieldForm;
  readonly optional: boolean;
};

export type SchemaType = { readonly name: string; readonly fields: readonly SchemaField[] };

/** The ontology: an open type space over the closed field vocabulary. */
export type Schema = { readonly types: readonly SchemaType[] };

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
  /** RESOLVED from the global `config.yaml` — objects, not names. */
  readonly mcpServers: readonly McpServer[];
  /** RESOLVED from `agents/` — objects, not names. */
  readonly agents: readonly Agent[];
  /** RESOLVED — carries the mode and the allowlist. */
  readonly source: Source;
  /** The source's own id for this conversation. */
  readonly peer: string;
  /** The speaker role, already resolved to a concrete model id. */
  readonly model: string;
};

export type Global = {
  readonly identity: string;
  readonly sources: readonly Source[];
  readonly models: ModelPolicy;
  readonly schema: Schema;
};

// ── the units ─────────────────────────────────────────────────────────

/**
 * A place a handle grants. It is a method, not a property, because an illegal
 * name has no `Place` — and the answer to "where is it" has to have somewhere to
 * say so. `BadName` is its only failure; the folder need not exist yet.
 */
export type Grant = () => Place | HomeProblem;

export type ChatHandle = {
  readonly slug: string;
  /** → `harness`, straight to Pi. The folder *is* the isolation. */
  cwd: Grant;
  /** → `channel`. Bounded by traffic, so `home` never opens it. */
  transcript: Grant;
  /** → `channel`. */
  media: Grant;
  /** → the Archive import receipt writer. Foreign: home vouches for the directory only. */
  imports: Grant;
  /** → the receipt fold. */
  now: Grant;
  read(): Chat | HomeProblem;
  plan(): readonly Problem[];
  converge(): Promise<readonly Problem[]>;
};

/**
 * A Source's own directory. It holds a **credential**, which is why it lives
 * inside the home and never in a cache: `~/.ambient` is the thing a user backs
 * up, and an account that has to be re-paired to be restored is not backed up.
 *
 * `home` vouches for the directory. What is written inside it belongs to
 * `channel`, which is the only module that knows what `whatsappd` stores.
 */
export type SourceHandle = {
  readonly name: string;
  /** → `channel`. The durable mirror: credential, log, messages, media index. */
  store: Grant;
  /** → `channel`. `whatsappd`'s own media tree, keyed by its refs and not by ours. */
  media: Grant;
  plan(): readonly Problem[];
  converge(): Promise<readonly Problem[]>;
};

export type AgentHandle = {
  readonly name: string;
  cwd: Grant;
  read(): Agent | HomeProblem;
  plan(): readonly Problem[];
  converge(): Promise<readonly Problem[]>;
};

export type Home = {
  /** Display only. */
  readonly root: string;
  /** → the `blobs` module. A property, not a `Grant`: the root has no name to be wrong. */
  readonly blobs: Place;
  /** → the `work` module. Optional on disk; `home` checks its magic bytes and stops. */
  readonly db: Place;

  read(): Global | HomeProblem;
  /** Pure and total — an illegal slug fails at `read()`, `plan()`, `converge()` and every `Grant`. */
  chat(slug: string): ChatHandle;
  agent(name: string): AgentHandle;
  /** Pure and total, like `chat`. A Source need not exist on disk to be named. */
  source(name: string): SourceHandle;
  chats(): readonly ChatHandle[];
  agents(): readonly AgentHandle[];
  sources(): readonly SourceHandle[];

  /** `doctor`. Ordered by `at`, then tag. `[]` means healthy. */
  plan(): readonly Problem[];
  /** `init`. Converges, never skips-if-exists, never overwrites authored content. */
  converge(): Promise<readonly Problem[]>;
};

// ── entry ─────────────────────────────────────────────────────────────

/**
 * Resolves a root. Does NOT read and does NOT validate: opening a home that does
 * not exist must succeed or `init` cannot run, and opening a broken one must
 * succeed or `doctor` cannot run. Validation is `plan()`.
 *
 * Fails only if `root` exists and is not a directory.
 *
 * Takes no dependencies. `home` spawns no process, reads no environment, and
 * writes `knowledge/` from its own templates rather than calling another CLI.
 */
export type OpenHome = (root: string) => Home | HomeProblem;

/** Rendering lives here, not in `cli`. */
export type DescribeHomeProblem = Describe<Problem>;
