/**
 * What a Node error actually is, and the only file that knows.
 *
 * Node reports an I/O failure as an `Error` carrying a `code` — `ENOENT`,
 * `EACCES`, `EEXIST`. Neither of those is in a type: a `catch` binds `unknown`,
 * and `code` is not on `Error` at all. So both facts are checked here, once,
 * rather than re-derived at each of the six places that used to do it.
 *
 * `String(cause)` is the honest last resort. A value that is not an `Error` can
 * still be raised, and printing it beats reporting nothing.
 */

export const messageOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

/** Node puts the code on the error object; it is not part of `Error`'s type. */
export const hasCode = (cause: unknown, code: string): boolean =>
  cause instanceof Error && "code" in cause && cause.code === code;
