/**
 * The three config schemas, declared rather than narrowed.
 *
 * Fail-closed is `onExcessProperty: "error"` in [yaml.ts](./yaml.ts) now, not a
 * hand-written `unknownKeys` pass: an unknown key is still a named problem and
 * never a silent default. Nothing here knows a path — text in, a value or a list
 * of problems out.
 *
 * **A section is a mapping of name to entry**, and the name is the key. Schema
 * decodes it as a `Record`; the two-line reshapes below put the key back on the
 * value as `name`, which is the form the rest of `home` already reads.
 *
 * **Roles are resolved here**, so a role never hands out a name that does not
 * exist. That is a cross-reference between two parts of one document rather than
 * a shape, so it stays a hand-written pass over the decoded value — `DanglingRef`
 * is a problem about meaning, and a schema cannot see it.
 */

import * as Schema from "effect/Schema";

import type { Checked } from "./problem.ts";
import { decodeYaml } from "./yaml.ts";
import type { McpServer, ModelProfile, ProblemDetail, Role, Source, Thinking } from "../types.ts";

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

const THINKING = Schema.Literals(["off", "low", "medium", "high"]);
const ROLES = ["default", "speaker", "digest", "media", "synthesis"] as const;

const SourceEntry = Schema.Struct({
  kind: Schema.Literals(["whatsapp", "email"]),
  mode: Schema.Literals(["ingest", "speak"]),
  allow: Schema.Array(Schema.String),
  self_label: Schema.optionalKey(Schema.String),
});

const McpEntry = Schema.Struct({
  command: Schema.String,
  args: Schema.optionalKey(Schema.Array(Schema.String)),
  env: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
});

const ModelEntry = Schema.Struct({
  provider: Schema.String,
  baseUrl: Schema.optionalKey(Schema.String),
  model: Schema.String,
  thinking: THINKING,
});

const GlobalDocument = Schema.Struct({
  sources: Schema.Record(Schema.String, SourceEntry),
  mcp: Schema.Record(Schema.String, McpEntry),
  models: Schema.Record(Schema.String, ModelEntry),
  roles: Schema.Struct({
    default: Schema.String,
    speaker: Schema.String,
    digest: Schema.String,
    media: Schema.String,
    synthesis: Schema.String,
  }),
});

const ChatDocument = Schema.Struct({
  source: Schema.String,
  peer: Schema.String,
  tools: Schema.Array(Schema.String),
  mcp: Schema.Array(Schema.String),
  agents: Schema.Array(Schema.String),
});

const AgentDocument = Schema.Struct({
  model: Schema.String,
  thinking: THINKING,
  mcp: Schema.Array(Schema.String),
  scope: Schema.String,
});

/**
 * A role naming a model that does not exist is a `DanglingRef`, not a bad value.
 *
 * `known` is every profile name, so the message can say what was available. The
 * whole document is refused when any role dangles, because a half-resolved
 * policy is the state `ModelPolicy` exists to make unrepresentable.
 */
const resolveRoles = (
  roles: Readonly<Record<Role, string>>,
  profiles: readonly ModelProfile[],
): Checked<Readonly<Record<Role, ModelProfile>>> => {
  const known = profiles.map((profile) => profile.name);
  const problems: ProblemDetail[] = [];
  const resolved: Partial<Record<Role, ModelProfile>> = {};
  for (const role of ROLES) {
    const wanted = roles[role];
    const hit = profiles.find((profile) => profile.name === wanted);
    if (hit === undefined) {
      problems.push({
        _tag: "DanglingRef",
        key: `roles.${role}`,
        to: wanted,
        kind: "model",
        known,
      });
    } else resolved[role] = hit;
  }
  const { default: fallback, speaker, digest, media, synthesis } = resolved;
  if (
    fallback === undefined ||
    speaker === undefined ||
    digest === undefined ||
    media === undefined ||
    synthesis === undefined
  ) {
    return { problems };
  }
  return { value: { default: fallback, speaker, digest, media, synthesis } };
};

export const readGlobalConfig = (src: string): Checked<GlobalConfig> => {
  const decoded = decodeYaml(GlobalDocument, src);
  if ("problems" in decoded) return decoded;
  const document = decoded.value;

  const sources: readonly Source[] = Object.entries(document.sources).map(([name, entry]) => ({
    name,
    kind: entry.kind,
    mode: entry.mode,
    allow: entry.allow,
    self_label: entry.self_label,
  }));
  const mcp: readonly McpServer[] = Object.entries(document.mcp).map(([name, entry]) => ({
    name,
    command: entry.command,
    args: entry.args ?? [],
    env: entry.env ?? {},
  }));
  const profiles: readonly ModelProfile[] = Object.entries(document.models).map(
    ([name, entry]) => ({
      name,
      provider: entry.provider,
      baseUrl: entry.baseUrl,
      model: entry.model,
      thinking: entry.thinking,
    }),
  );

  const roles = resolveRoles(document.roles, profiles);
  return "problems" in roles ? roles : { value: { sources, mcp, profiles, roles: roles.value } };
};

export const readChatConfig = (src: string): Checked<ChatConfig> => decodeYaml(ChatDocument, src);

export const readAgentConfig = (src: string): Checked<AgentConfig> =>
  decodeYaml(AgentDocument, src);
