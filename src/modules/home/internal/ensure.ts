/**
 * One list of things that must be true, and two verbs over it.
 *
 * `plan` runs every `check`; `converge` runs every `make`, then every `check`.
 * The old failure mode — `init` creating a file `doctor` forgot to check — has
 * nowhere to live, because both verbs read the same list.
 */

import { readAgentConfig, readChatConfig, readGlobalConfig } from "./config.ts";
import { readSchema } from "./schema.ts";
import type { Layout, Parsed } from "./disk.ts";
import { at, badName, entries, isSqlite, legal, list, look, mkdir, writeNew } from "./disk.ts";
import { detailsOf, kindOf, ordered, problem } from "./problem.ts";
import { readText } from "./read.ts";
import { crossRefs } from "./refs.ts";
import * as template from "./templates.ts";
import type { Problem, ProblemDetail } from "../types.ts";

/** One item of the list. `plan` runs `check`; `converge` runs `make` then `check`. */
export type Ensure = {
  readonly at: string;
  /** Resolving with a detail means convergence failed, and says why. It never throws. */
  readonly make?: () => Promise<ProblemDetail | undefined>;
  readonly check: () => readonly Problem[];
};

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

const dirItem = (h: Layout, label: string, abs: string): Ensure => ({
  at: label,
  make: async () => (look(h, abs).kind === "absent" ? await mkdir(abs) : undefined),
  check: () => {
    const f = look(h, abs);
    return f.kind === "dir" ? [] : [problem(label, kindOf(f, "directory"))];
  },
});

/** Written from a template, checked for presence only — never parsed. */
const plainItem = (h: Layout, label: string, dir: string, name: string, body: string): Ensure => ({
  at: label,
  make: () => writeNew(h, dir, name, body),
  check: () => {
    const f = look(h, at(dir, name));
    return f.kind === "file" ? [] : [problem(label, kindOf(f, "file"))];
  },
});

/** Written from a template, then read whole and validated. */
const fileItem = (
  h: Layout,
  label: string,
  dir: string,
  name: Parsed,
  body: string,
  validate?: (text: string) => readonly ProblemDetail[],
): Ensure => ({
  ...plainItem(h, label, dir, name, body),
  check: () => {
    const out: Problem[] = [];
    const text = readText(out, h, label, dir, name);
    if (text === undefined) return out;
    return (validate?.(text) ?? []).map((d) => problem(label, d));
  },
});

/** `config.yml` beside `config.yaml`, `mandate.MD` beside `mandate.md`. */
const normal = (name: string): string => name.toLowerCase().replace(/\.yml$/, ".yaml");

/** A file that looks like it should work and silently does not is the worst failure. */
const namesItem = (h: Layout, label: string, abs: string, declared: readonly string[]): Ensure => ({
  at: label,
  check: () => {
    const found = list(h, abs);
    if ("_tag" in found) return [problem(label, found)];
    return found.flatMap((entry) => {
      if (declared.includes(entry)) return [];
      const near = declared.find((d) => normal(d) === normal(entry));
      return near === undefined
        ? []
        : [problem(`${label}${entry}`, { _tag: "BadName", got: entry, expected: `"${near}"` })];
    });
  },
});

/** Names are a trust boundary. `..` must never become a path. */
const childrenItem = (h: Layout, label: string, abs: string): Ensure => ({
  at: label,
  check: () => {
    const found = list(h, abs);
    if ("_tag" in found) return [problem(label, found)];
    return found.filter((e) => !legal(e)).map((e) => problem(`${label}${e}`, badName(e)));
  },
});

/**
 * `knowledge/` is OpenKnowledge's tree, written from our own templates: we match
 * the format and never call its CLI, so there is no nested `.git` and no editor
 * wiring. `home` writes the scaffold once and never reads inside it again.
 */
const knowledgeItem = (h: Layout): Ensure => ({
  at: "knowledge/",
  make: async () => {
    const ok = at(h.knowledge, ".ok");
    return (
      (await mkdir(ok)) ??
      (await writeNew(h, ok, "config.yml", template.OK_CONFIG)) ??
      (await writeNew(h, ok, ".gitignore", template.OK_GITIGNORE)) ??
      (await writeNew(h, h.knowledge, ".okignore", template.OKIGNORE))
    );
  },
  check: () => {
    const f = look(h, h.knowledge);
    return f.kind === "dir" ? [] : [problem("knowledge/", kindOf(f, "directory"))];
  },
});

/** Optional: SKELETON ships no `work`, so a healthy home has no database. */
const dbItem = (h: Layout): Ensure => ({
  at: "state.db",
  check: () => {
    const f = look(h, h.db);
    if (f.kind === "absent") return [];
    if (f.kind !== "file") return [problem("state.db", kindOf(f, "file"))];
    const magic = isSqlite(h.db);
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
});

export const slugs = (h: Layout): readonly string[] => entries(h, h.chats);
export const names = (h: Layout): readonly string[] => entries(h, h.agents);

export const chatItems = (h: Layout, slug: string): readonly Ensure[] => {
  const label = `chats/${slug}`;
  if (!legal(slug)) return [{ at: label, check: () => [problem(label, badName(slug))] }];
  const dir = at(h.chats, slug);
  return [
    dirItem(h, ".", h.root),
    dirItem(h, "chats/", h.chats),
    dirItem(h, `${label}/`, dir),
    fileItem(h, `${label}/config.yaml`, dir, "config.yaml", template.CHAT_CONFIG, (t) =>
      detailsOf(readChatConfig(t)),
    ),
    fileItem(h, `${label}/mandate.md`, dir, "mandate.md", template.MANDATE(slug)),
    namesItem(h, `${label}/`, dir, CHAT_ENTRIES),
  ];
};

export const agentItems = (h: Layout, name: string): readonly Ensure[] => {
  const label = `agents/${name}`;
  if (!legal(name)) return [{ at: label, check: () => [problem(label, badName(name))] }];
  const dir = at(h.agents, name);
  return [
    dirItem(h, ".", h.root),
    dirItem(h, "agents/", h.agents),
    dirItem(h, `${label}/`, dir),
    fileItem(h, `${label}/agent.yaml`, dir, "agent.yaml", template.AGENT_CONFIG, (t) =>
      detailsOf(readAgentConfig(t)),
    ),
    fileItem(h, `${label}/SKILL.md`, dir, "SKILL.md", template.SKILL(name)),
    namesItem(h, `${label}/`, dir, AGENT_ENTRIES),
  ];
};

const crossItem = (h: Layout): Ensure => ({ at: "", check: () => crossRefs(h) });

export const homeItems = (h: Layout): readonly Ensure[] => [
  dirItem(h, ".", h.root),
  fileItem(h, "identity.md", h.root, "identity.md", template.IDENTITY),
  fileItem(h, "config.yaml", h.root, "config.yaml", template.CONFIG, (t) =>
    detailsOf(readGlobalConfig(t)),
  ),
  fileItem(h, "schema.yaml", h.root, "schema.yaml", template.SCHEMA, (t) =>
    detailsOf(readSchema(t)),
  ),
  plainItem(h, ".gitignore", h.root, ".gitignore", template.GITIGNORE),
  knowledgeItem(h),
  dirItem(h, "blobs/", h.blobs),
  dirItem(h, "chats/", h.chats),
  dirItem(h, "agents/", h.agents),
  dbItem(h),
  namesItem(h, "", h.root, ROOT_ENTRIES),
  childrenItem(h, "chats/", h.chats),
  childrenItem(h, "agents/", h.agents),
  ...slugs(h).flatMap((slug) => chatItems(h, slug)),
  ...names(h).flatMap((name) => agentItems(h, name)),
  crossItem(h),
];

export const planned = (items: readonly Ensure[]): readonly Problem[] =>
  ordered(items.flatMap((i) => i.check()));

export const converged = async (items: readonly Ensure[]): Promise<readonly Problem[]> => {
  const failures: Problem[] = [];
  for (const item of items) {
    const failed = await item.make?.();
    if (failed !== undefined) failures.push(problem(item.at, failed));
  }
  return ordered([...failures, ...items.flatMap((i) => i.check())]);
};
