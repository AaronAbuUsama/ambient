/**
 * What one thing that must be true looks like, and the six shapes they come in.
 *
 * Split out of `ensure.ts` when the Source unit landed and it crossed 250 lines.
 * The seam is real rather than arithmetic: this file says what an item *is*, and
 * `ensure.ts` says which items each unit *has*.
 */

import type { Layout, Parsed } from "./disk.ts";
import { at, badName, isSqlite, legal, list, look, mkdir, writeNew } from "./disk.ts";
import { kindOf, problem } from "./problem.ts";
import { readText } from "./read.ts";
import * as template from "./templates.ts";
import type { Problem, ProblemDetail } from "../types.ts";

/** One item of the list. `plan` runs `check`; `converge` runs `make` then `check`. */
export type Ensure = {
  readonly at: string;
  /** Resolving with a detail means convergence failed, and says why. It never throws. */
  readonly make?: () => Promise<ProblemDetail | undefined>;
  readonly check: () => readonly Problem[];
};

export const dirItem = (h: Layout, label: string, abs: string): Ensure => ({
  at: label,
  make: async () => (look(h, abs).kind === "absent" ? await mkdir(abs) : undefined),
  check: () => {
    const f = look(h, abs);
    return f.kind === "dir" ? [] : [problem(label, kindOf(f, "directory"))];
  },
});

/** Written from a template, checked for presence only — never parsed. */
export const plainItem = (
  h: Layout,
  label: string,
  dir: string,
  name: string,
  body: string,
): Ensure => ({
  at: label,
  make: () => writeNew(h, dir, name, body),
  check: () => {
    const f = look(h, at(dir, name));
    return f.kind === "file" ? [] : [problem(label, kindOf(f, "file"))];
  },
});

/** Written from a template, then read whole and validated. */
export const fileItem = (
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
export const namesItem = (
  h: Layout,
  label: string,
  abs: string,
  declared: readonly string[],
): Ensure => ({
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
export const childrenItem = (h: Layout, label: string, abs: string): Ensure => ({
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
export const knowledgeItem = (h: Layout): Ensure => ({
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
export const dbItem = (h: Layout): Ensure => ({
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
