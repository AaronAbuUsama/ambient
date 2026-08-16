/**
 * The filesystem, as `home` uses it.
 *
 * This is the only file in the repository that reads a file's contents, and the
 * only one that mints a `Place`. ADR 001's escrow rule and invariant 8 are both
 * checkable because everything narrow lives here.
 */

import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

declare const place: unique symbol;

/** An absolute path inside the home. Home made it, checked its kind, and will not move it. */
export type Place = { readonly path: string; readonly [place]: true };

/**
 * The only mint. Branding cannot be expressed without one assertion, and this is
 * the proven boundary where it is correct: `abs` was built by `home` from a root
 * `home` resolved, out of a name `home` checked.
 */
export const placeAt = (abs: string): Place => ({ path: abs }) as Place;

export const at = (...segments: readonly string[]): string => path.join(...segments);

export const absolute = (root: string): string => path.resolve(root);

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

export const causeOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const codeOf = (e: unknown): string =>
  e instanceof Error && "code" in e && typeof e.code === "string" ? e.code : "";

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
export const look = (root: string, abs: string): Found => {
  let st: fs.Stats;
  try {
    st = fs.lstatSync(abs);
  } catch (e) {
    return codeOf(e) === "ENOENT" ? { kind: "absent" } : { kind: "unreadable", cause: causeOf(e) };
  }
  if (st.isSymbolicLink()) {
    const target = real(abs);
    if (target === undefined) return { kind: "other" };
    if (!inside(real(root) ?? root, target)) return { kind: "escapes" };
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
export const readParsed = (root: string, dir: string, name: Parsed): Read => {
  const abs = at(dir, name);
  const found = look(root, abs);
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

/** Directory entries, sorted, or `undefined` if there is no readable directory. */
export const list = (root: string, abs: string): readonly string[] | undefined => {
  if (look(root, abs).kind !== "dir") return undefined;
  try {
    return fs.readdirSync(abs).sort();
  } catch {
    return undefined;
  }
};

export const mkdir = async (abs: string): Promise<void> => {
  await fsp.mkdir(abs, { recursive: true });
};

/**
 * Temp-then-rename, in the same directory so the rename is atomic. A file is old
 * or new, never torn — ADR 001 invariant 4.
 */
export const writeNew = async (dir: string, name: string, content: string): Promise<void> => {
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const tmp = at(dir, `.${name}.tmp-${stamp}`);
  try {
    await fsp.writeFile(tmp, content, { encoding: "utf8", flag: "wx" });
    await fsp.rename(tmp, at(dir, name));
  } catch (e) {
    await fsp.rm(tmp, { force: true });
    throw e;
  }
};
