/**
 * The three config schemas and the ontology vocabulary, validated fail-closed:
 * an unknown key is a named problem, never a silent default and never a dropped
 * field. YAML is `unknown` until it has been narrowed here.
 */

import { parseDocument } from "yaml";

import type { Checked, ProblemDetail } from "./problem.ts";

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

export type FieldForm =
  | { readonly form: "text" | "text[]" | "ref" | "ref[]" | "date" }
  | { readonly form: "enum"; readonly of: readonly string[] };

export type SchemaField = {
  readonly name: string;
  readonly type: FieldForm;
  readonly optional: boolean;
};

export type SchemaType = { readonly name: string; readonly fields: readonly SchemaField[] };

/** The closed field vocabulary, over an open type space. */
export type Schema = { readonly types: readonly SchemaType[] };

export type GlobalConfig = {
  readonly sources: readonly Source[];
  readonly mcp: readonly McpServer[];
  readonly models: ModelPolicy;
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

const THINKING = ["off", "low", "medium", "high"] as const;
const KINDS = ["whatsapp", "email"] as const;
const MODES = ["ingest", "speak"] as const;
const ROLES = ["default", "speaker", "digest", "media", "synthesis"] as const;

const SOURCE_KEYS = ["kind", "mode", "allow"] as const;
const MCP_KEYS = ["command", "args", "env"] as const;
const MODEL_KEYS = ["provider", "baseUrl", "model", "thinking"] as const;
const GLOBAL_KEYS = ["sources", "mcp", "models", "roles"] as const;
const CHAT_KEYS = ["source", "peer", "tools", "mcp", "agents"] as const;
const AGENT_KEYS = ["model", "thinking", "mcp", "scope"] as const;

type Out = ProblemDetail[];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** What a human sees in `got "…"`. Never a stringified object. */
const show = (v: unknown): string => {
  if (v === null || v === undefined) return "nothing";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  if (Array.isArray(v)) return "a list";
  return typeof v === "object" ? "a mapping" : typeof v;
};

const record = (out: Out, key: string, v: unknown): Record<string, unknown> | undefined => {
  if (isRecord(v)) return v;
  out.push({ _tag: "BadValue", key, expected: "a mapping", got: show(v) });
  return undefined;
};

const text = (out: Out, key: string, v: unknown): string | undefined => {
  if (typeof v === "string") return v;
  out.push({ _tag: "BadValue", key, expected: "text", got: show(v) });
  return undefined;
};

const textList = (out: Out, key: string, v: unknown): readonly string[] | undefined => {
  if (!Array.isArray(v)) {
    out.push({ _tag: "BadValue", key, expected: "a list of text", got: show(v) });
    return undefined;
  }
  const items: string[] = [];
  let good = true;
  for (const [i, item] of v.entries()) {
    const s = text(out, `${key}[${i}]`, item);
    if (s === undefined) good = false;
    else items.push(s);
  }
  return good ? items : undefined;
};

const textMap = (
  out: Out,
  key: string,
  v: unknown,
): Readonly<Record<string, string>> | undefined => {
  const rec = record(out, key, v);
  if (rec === undefined) return undefined;
  const map: Record<string, string> = {};
  let good = true;
  for (const [k, item] of Object.entries(rec)) {
    const s = text(out, `${key}.${k}`, item);
    if (s === undefined) good = false;
    else map[k] = s;
  }
  return good ? map : undefined;
};

const oneOf = <T extends string>(
  out: Out,
  key: string,
  v: unknown,
  of: readonly T[],
): T | undefined => {
  const hit = of.find((o) => o === v);
  if (hit !== undefined) return hit;
  out.push({ _tag: "BadValue", key, expected: `one of ${of.join("|")}`, got: show(v) });
  return undefined;
};

const unknownKeys = (
  out: Out,
  prefix: string,
  rec: Record<string, unknown>,
  known: readonly string[],
): void => {
  for (const k of Object.keys(rec)) {
    if (!known.includes(k)) out.push({ _tag: "UnknownKey", key: prefix + k, known });
  }
};

const need = <T>(
  out: Out,
  prefix: string,
  rec: Record<string, unknown>,
  key: string,
  read: (v: unknown) => T | undefined,
): T | undefined => {
  if (!(key in rec)) {
    out.push({ _tag: "MissingKey", key: prefix + key });
    return undefined;
  }
  return read(rec[key]);
};

const firstLine = (message: string): string =>
  (message.split("\n")[0] ?? message).replace(/ at line \d+, column \d+:?$/, "");

/** YAML in, `unknown` out — with line and column when it will not parse. */
export const parseYaml = (src: string): Checked<unknown> => {
  const doc = parseDocument(src, { prettyErrors: true });
  if (doc.errors.length > 0) {
    return {
      problems: doc.errors.map((e) => ({
        _tag: "Malformed" as const,
        line: e.linePos?.[0].line ?? 1,
        column: e.linePos?.[0].col,
        detail: `malformed YAML — ${firstLine(e.message)}`,
      })),
    };
  }
  return { value: doc.toJS() };
};

const done = <T>(out: Out, value: T | undefined): Checked<T> => {
  if (value !== undefined && out.length === 0) return { value };
  if (out.length === 0) out.push({ _tag: "BadValue", key: "", expected: "complete", got: "" });
  return { problems: out };
};

export const readGlobalConfig = (src: string): Checked<GlobalConfig> => {
  const parsed = parseYaml(src);
  if ("problems" in parsed) return parsed;
  const out: Out = [];
  const root = record(out, "", parsed.value);
  if (root === undefined) return { problems: out };
  unknownKeys(out, "", root, GLOBAL_KEYS);

  const sources: Source[] = [];
  const srec = need(out, "", root, "sources", (v) => record(out, "sources", v));
  for (const [name, v] of Object.entries(srec ?? {})) {
    const at = `sources.${name}`;
    const r = record(out, at, v);
    if (r === undefined) continue;
    unknownKeys(out, `${at}.`, r, SOURCE_KEYS);
    const kind = need(out, `${at}.`, r, "kind", (x) => oneOf(out, `${at}.kind`, x, KINDS));
    const mode = need(out, `${at}.`, r, "mode", (x) => oneOf(out, `${at}.mode`, x, MODES));
    const allow = need(out, `${at}.`, r, "allow", (x) => textList(out, `${at}.allow`, x));
    if (kind !== undefined && mode !== undefined && allow !== undefined)
      sources.push({ name, kind, mode, allow });
  }

  const mcp: McpServer[] = [];
  const mrec = need(out, "", root, "mcp", (v) => record(out, "mcp", v));
  for (const [name, v] of Object.entries(mrec ?? {})) {
    const at = `mcp.${name}`;
    const r = record(out, at, v);
    if (r === undefined) continue;
    unknownKeys(out, `${at}.`, r, MCP_KEYS);
    const command = need(out, `${at}.`, r, "command", (x) => text(out, `${at}.command`, x));
    const args = "args" in r ? textList(out, `${at}.args`, r.args) : [];
    const env = "env" in r ? textMap(out, `${at}.env`, r.env) : {};
    if (command !== undefined && args !== undefined && env !== undefined)
      mcp.push({ name, command, args, env });
  }

  const profiles: ModelProfile[] = [];
  const prec = need(out, "", root, "models", (v) => record(out, "models", v));
  for (const [name, v] of Object.entries(prec ?? {})) {
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
    if (provider !== undefined && model !== undefined && thinking !== undefined)
      profiles.push({ name, provider, model, thinking, baseUrl });
  }

  const known = profiles.map((p) => p.name);
  const roles: Partial<Record<Role, ModelProfile>> = {};
  const rrec = need(out, "", root, "roles", (v) => record(out, "roles", v));
  if (rrec !== undefined) {
    unknownKeys(out, "roles.", rrec, ROLES);
    for (const role of ROLES) {
      const name = need(out, "roles.", rrec, role, (x) => text(out, `roles.${role}`, x));
      if (name === undefined) continue;
      const hit = profiles.find((p) => p.name === name);
      if (hit === undefined)
        out.push({ _tag: "DanglingRef", key: `roles.${role}`, to: name, kind: "model", known });
      else roles[role] = hit;
    }
  }

  const { default: fallback, speaker, digest, media, synthesis } = roles;
  return done(
    out,
    fallback !== undefined &&
      speaker !== undefined &&
      digest !== undefined &&
      media !== undefined &&
      synthesis !== undefined
      ? {
          sources,
          mcp,
          models: {
            profiles,
            roles: { default: fallback, speaker, digest, media, synthesis },
          },
        }
      : undefined,
  );
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
  return done(
    out,
    source !== undefined &&
      peer !== undefined &&
      tools !== undefined &&
      mcp !== undefined &&
      agents !== undefined
      ? { source, peer, tools, mcp, agents }
      : undefined,
  );
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
  return done(
    out,
    model !== undefined && thinking !== undefined && mcp !== undefined && scope !== undefined
      ? { model, thinking, mcp, scope }
      : undefined,
  );
};

const FORM = /^(text\[\]|ref\[\]|text|ref|date|enum\([^()|]+(\|[^()|]+)*\))(\?)?$/;
const FORMS = "text · text[] · ref · ref[] · date · enum(a|b|c), optionally suffixed with ?";

const fieldForm = (out: Out, key: string, v: unknown): SchemaField["type"] | undefined => {
  const raw = typeof v === "string" ? v : undefined;
  const m = raw === undefined ? null : FORM.exec(raw);
  if (m === null) {
    out.push({ _tag: "BadValue", key, expected: FORMS, got: show(v) });
    return undefined;
  }
  const head = m[1];
  if (head.startsWith("enum("))
    return {
      form: "enum",
      of: head
        .slice(5, -1)
        .split("|")
        .map((s) => s.trim()),
    };
  const plain = ["text", "text[]", "ref", "ref[]", "date"] as const;
  return { form: plain.find((p) => p === head) ?? "text" };
};

/** Users add types. Users cannot add field forms — that is the whole distinction. */
export const readSchema = (src: string): Checked<Schema> => {
  const parsed = parseYaml(src);
  if ("problems" in parsed) return parsed;
  const out: Out = [];
  const root = record(out, "", parsed.value);
  if (root === undefined) return { problems: out };
  const types: SchemaType[] = [];
  for (const [name, v] of Object.entries(root)) {
    const r = record(out, name, v);
    if (r === undefined) continue;
    const fields: SchemaField[] = [];
    for (const [field, form] of Object.entries(r)) {
      const key = `${name}.${field}`;
      const optional = typeof form === "string" && form.endsWith("?");
      const type = fieldForm(out, key, form);
      if (type !== undefined) fields.push({ name: field, type, optional });
    }
    types.push({ name, fields });
  }
  return out.length > 0 ? { problems: out } : { value: { types } };
};
