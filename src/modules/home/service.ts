/**
 * `openHome` and the three handles. This file is the assembly and nothing else —
 * every check, read, template and write lives in `internal/`.
 */

import type { Layout } from "./internal/disk.ts";
import { at, layoutOf, legal, look, placeAt } from "./internal/disk.ts";
import type { Ensure } from "./internal/ensure.ts";
import {
  agentItems,
  chatItems,
  converged,
  homeItems,
  names,
  planned,
  slugs,
} from "./internal/ensure.ts";
import { describe as rendered, kindOf, problem } from "./internal/problem.ts";
import { readAgent, readChat, readGlobal } from "./internal/read.ts";
import type { AgentHandle, ChatHandle, Describe, OpenHome, Place } from "./types.ts";

/** Both verbs over one list, so `plan` and `converge` cannot drift apart. */
const verbs = (items: () => readonly Ensure[]) => ({
  plan: () => planned(items()),
  converge: () => converged(items()),
});

const chatHandle = (h: Layout, slug: string): ChatHandle => {
  /** No `Place` is ever produced for an illegal slug — ADR 001 invariant 7. */
  const grant = (name?: string): Place => {
    if (!legal(slug)) throw new Error(`chats/${slug}: illegal slug — no Place exists for it`);
    const dir = at(h.chats, slug);
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
    read: () => readChat(h, slug),
    ...verbs(() => chatItems(h, slug)),
  };
};

const agentHandle = (h: Layout, name: string): AgentHandle => ({
  name,
  get cwd() {
    if (!legal(name)) throw new Error(`agents/${name}: illegal name — no Place exists for it`);
    return placeAt(at(h.agents, name));
  },
  read: () => readAgent(h, name),
  ...verbs(() => agentItems(h, name)),
});

export const openHome: OpenHome = (root) => {
  const h = layoutOf(root);
  const found = look(h, h.root);
  if (found.kind !== "absent" && found.kind !== "dir") {
    return { problems: [problem(".", kindOf(found, "directory"))] };
  }
  return {
    root: h.root,
    blobs: placeAt(h.blobs),
    db: placeAt(h.db),

    read: () => readGlobal(h),
    chat: (slug) => chatHandle(h, slug),
    agent: (name) => agentHandle(h, name),
    chats: () => slugs(h).map((slug) => chatHandle(h, slug)),
    agents: () => names(h).map((name) => agentHandle(h, name)),

    ...verbs(() => homeItems(h)),
  };
};

/** Rendering lives in `home`, not in `cli`. */
export const describe: Describe = rendered;
