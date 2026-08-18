/**
 * One list of things that must be true, and two verbs over it.
 *
 * `plan` runs every `check`; `converge` runs every `make`, then every `check`.
 * The old failure mode — `init` creating a file `doctor` forgot to check — has
 * nowhere to live, because both verbs read the same list.
 *
 * What each shape of item *is* lives in [`items.ts`](./items.ts).
 */

import { readAgentConfig, readChatConfig, readGlobalConfig } from "./config.ts";
import { readSchema } from "./schema.ts";
import type { Layout } from "./disk.ts";
import { at, badName, entries, legal } from "./disk.ts";
import type { Ensure } from "./items.ts";
import {
  childrenItem,
  dbItem,
  dirItem,
  fileItem,
  knowledgeItem,
  namesItem,
  plainItem,
} from "./items.ts";
import { detailsOf, ordered, problem } from "./problem.ts";
import { crossRefs } from "./refs.ts";
import * as template from "./templates.ts";
import type { Problem } from "../types.ts";

export type { Ensure } from "./items.ts";

const ROOT_ENTRIES = [
  "identity.md",
  "config.yaml",
  "schema.yaml",
  ".gitignore",
  "knowledge",
  "blobs",
  "chats",
  "agents",
  "sources",
  "state.db",
] as const;
const CHAT_ENTRIES = [
  "config.yaml",
  "mandate.md",
  "skills",
  "transcript.jsonl",
  "media",
  "imports",
  "now.md",
] as const;
const AGENT_ENTRIES = ["agent.yaml", "SKILL.md"] as const;
/**
 * A Source directory holds what `channel` put there and nothing of ours. The two
 * sidecars are SQLite's, created beside the database the moment WAL is entered —
 * declaring them is what stops `doctor` reading a healthy account as a mess.
 */
const SOURCE_ENTRIES = ["whatsapp.db", "whatsapp.db-wal", "whatsapp.db-shm", "media"] as const;

export const slugs = (h: Layout): readonly string[] => entries(h, h.chats);
export const names = (h: Layout): readonly string[] => entries(h, h.agents);
export const sourceNames = (h: Layout): readonly string[] => entries(h, h.sources);

/**
 * A Source is converged by `ambient pair`, not by `init`: the directory is
 * where a credential goes, and scaffolding one for every configured Source
 * would put empty account folders on disk for accounts nobody has linked.
 * So this list makes the directory, and `channel` fills it.
 */
export const sourceItems = (h: Layout, name: string): readonly Ensure[] => {
  const label = `sources/${name}`;
  if (!legal(name)) return [{ at: label, check: () => [problem(label, badName(name))] }];
  const dir = at(h.sources, name);
  return [
    dirItem(h, ".", h.root),
    dirItem(h, "sources/", h.sources),
    dirItem(h, `${label}/`, dir),
    namesItem(h, `${label}/`, dir, SOURCE_ENTRIES),
  ];
};

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
    dirItem(h, `${label}/imports/`, at(dir, "imports")),
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
  dirItem(h, "sources/", h.sources),
  dbItem(h),
  namesItem(h, "", h.root, ROOT_ENTRIES),
  childrenItem(h, "chats/", h.chats),
  childrenItem(h, "agents/", h.agents),
  childrenItem(h, "sources/", h.sources),
  ...slugs(h).flatMap((slug) => chatItems(h, slug)),
  ...names(h).flatMap((name) => agentItems(h, name)),
  ...sourceNames(h).flatMap((name) => sourceItems(h, name)),
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
