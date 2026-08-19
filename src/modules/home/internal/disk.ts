/**
 * Paths, names and the filesystem, as `home` uses them.
 *
 * This is the only file in the repository that reads a file's contents, the only
 * one that mints a `Place`, and the only one that joins a path. ADR 001's escrow
 * rule and invariant 8 are both checkable because everything narrow lives here.
 */

import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import type { Place, ProblemDetail } from "../types.ts";

/**
 * The only mint. Branding cannot be expressed without one assertion, and this is
 * the proven boundary where it is correct: `abs` was built by `home` from a root
 * `home` resolved, out of a name `home` checked.
 */
export const placeAt = (abs: string): Place =>
  // SAFETY: `Place`'s brand is `[place]: true` keyed by `declare const place: unique
  // symbol` — a phantom that exists in the type system and never at runtime, so there
  // is no property to construct and `{ path: abs }` is already the whole value. The
  // assertion adds a compile-time tag to a complete object; it hides nothing. It is
  // sound *here* and nowhere else because this function is the only mint in the
  // repository, and the tag's meaning — home made this path, checked its kind, and
  // will not move it — is exactly what every caller of `placeAt` has established.
  ({ path: abs }) as Place;

export const at = (...segments: readonly string[]): string => path.join(...segments);

/** Where everything in one home lives. The only value that knows the layout. */
export type Layout = {
  readonly root: string;
  readonly chats: string;
  readonly agents: string;
  readonly sources: string;
  readonly knowledge: string;
  readonly blobs: string;
  readonly db: string;
};

export const layoutOf = (root: string): Layout => {
  const abs = path.resolve(root);
  return {
    root: abs,
    chats: at(abs, "chats"),
    agents: at(abs, "agents"),
    sources: at(abs, "sources"),
    knowledge: at(abs, "knowledge"),
    blobs: at(abs, "blobs"),
    db: at(abs, "state.db"),
  };
};

/**
 * Names are a trust boundary, because a name becomes a path. Chat slugs will
 * eventually derive from WhatsApp group names, and `..` must never become a path.
 * This check exists in exactly one place.
 */
const LEGAL = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const legal = (name: string): boolean => LEGAL.test(name);

export const badName = (got: string): ProblemDetail => ({
  _tag: "BadName",
  got,
  expected: LEGAL.source,
});

/**
 * Every file `home` opens whole. Each is bounded by *configuration*, never by
 * *traffic* — ADR 001 invariant 8. `transcript.jsonl`, `blobs/`, `media/` and
 * anything under `knowledge/` cannot be named here, which is what turns the
 * invariant from folklore into a type.
 */
export type Parsed =
  | "identity.md"
  | "config.yaml"
  | "schema.yaml"
  | "mandate.md"
  | "agent.yaml"
  | "SKILL.md";

/** What is at a path. `escapes` means a symlink pointed outside the home. */
export type Found =
  | { readonly kind: "absent" }
  | { readonly kind: "file" }
  | { readonly kind: "dir" }
  | { readonly kind: "other" }
  | { readonly kind: "escapes" }
  | { readonly kind: "unreadable"; readonly cause: string };

export type Read = Found | { readonly kind: "text"; readonly text: string };

export const causeOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const real = (p: string): string | undefined => {
  try {
    return fs.realpathSync(p);
  } catch {
    return undefined;
  }
};

const inside = (root: string, p: string): boolean =>
  p === root || p.startsWith(`${root}${path.sep}`);

/** Stat one path, resolving symlinks and refusing any that leaves the home. */
export const look = (h: Layout, abs: string): Found => {
  let st: fs.Stats;
  try {
    st = fs.lstatSync(abs);
  } catch (e) {
    // The one question asked of a caught error here, and it is asked once.
    return e instanceof Error && "code" in e && e.code === "ENOENT"
      ? { kind: "absent" }
      : { kind: "unreadable", cause: causeOf(e) };
  }
  if (st.isSymbolicLink()) {
    const target = real(abs);
    if (target === undefined) return { kind: "other" };
    if (!inside(real(h.root) ?? h.root, target)) return { kind: "escapes" };
    try {
      st = fs.statSync(abs);
    } catch (e) {
      return { kind: "unreadable", cause: causeOf(e) };
    }
  }
  if (st.isDirectory()) return { kind: "dir" };
  if (st.isFile()) return { kind: "file" };
  return { kind: "other" };
};

/** Read one configuration-bounded file whole. The only whole-file read in the repo. */
export const readParsed = (h: Layout, dir: string, name: Parsed): Read => {
  const abs = at(dir, name);
  const found = look(h, abs);
  if (found.kind !== "file") return found;
  try {
    return { kind: "text", text: fs.readFileSync(abs, "utf8") };
  } catch (e) {
    return { kind: "unreadable", cause: causeOf(e) };
  }
};

const SQLITE = "SQLite format 3\0";

/**
 * The header magic of `state.db`, and nothing schema-level — that is `work`'s.
 * A bounded 16-byte read, not a read of the file.
 */
export const isSqlite = (abs: string): boolean | { readonly cause: string } => {
  let fd: number | undefined;
  try {
    fd = fs.openSync(abs, "r");
    const buf = Buffer.alloc(SQLITE.length);
    const n = fs.readSync(fd, buf, 0, SQLITE.length, 0);
    return n === SQLITE.length && buf.toString("latin1") === SQLITE;
  } catch (e) {
    return { cause: causeOf(e) };
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
};

/**
 * Directory entries, sorted. Nothing at all lists as nothing — the item that
 * expects a directory reports its absence. A directory that exists and cannot be
 * read is a problem in its own right, and says so rather than reading as empty.
 */
export const list = (h: Layout, abs: string): readonly string[] | ProblemDetail => {
  if (look(h, abs).kind !== "dir") return [];
  try {
    return fs.readdirSync(abs).sort();
  } catch (e) {
    return { _tag: "Unreadable", cause: causeOf(e) };
  }
};

/**
 * The same listing for the two passes that enumerate rather than check: they walk
 * what is there, and the item that owns the directory is what reports it missing
 * or unreadable. Saying it twice is what `ordered` would have to undo.
 */
export const entries = (h: Layout, abs: string): readonly string[] => {
  const found = list(h, abs);
  return "_tag" in found ? [] : found;
};

/** Every write answers with why it failed. `home` throws nothing — see `types.ts`. */
export const mkdir = async (abs: string): Promise<ProblemDetail | undefined> => {
  try {
    await fsp.mkdir(abs, { recursive: true });
    return undefined;
  } catch (e) {
    return { _tag: "Unreadable", cause: causeOf(e) };
  }
};

/**
 * Temp-then-rename, in the same directory so the rename is atomic. A file is old
 * or new, never torn — ADR 001 invariant 4. Absent files only: convergence
 * creates what is missing and never overwrites authored content.
 */
export const writeNew = async (
  h: Layout,
  dir: string,
  name: string,
  content: string,
): Promise<ProblemDetail | undefined> => {
  if (look(h, at(dir, name)).kind !== "absent") return undefined;
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const tmp = at(dir, `.${name}.tmp-${stamp}`);
  try {
    await fsp.writeFile(tmp, content, { encoding: "utf8", flag: "wx" });
    await fsp.rename(tmp, at(dir, name));
    return undefined;
  } catch (e) {
    // The write already failed; a failure to clear the temp file cannot say
    // anything the caller does not already know, and must not mask it.
    await fsp.rm(tmp, { force: true }).catch(() => undefined);
    return { _tag: "Unreadable", cause: causeOf(e) };
  }
};
