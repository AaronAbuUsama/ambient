/**
 * How a caught error becomes a Failure — the interface.
 *
 * A Failure is a declared value in the failing module's own `types.ts`, never an
 * exception ([errors.md](../../../docs/rules/errors.md)). This module owns the one
 * step every module shares on the way there: a `catch` hands back `unknown`, and
 * something has to turn it into text a person reads.
 *
 * It owns nothing else. It names no other module, opens no file and has no state,
 * which is why every module may depend on it and it depends on nothing.
 */

/**
 * The Cause: what a caught error leaves behind once it is a Failure.
 *
 * `cause` is `unknown` because TypeScript's `useUnknownInCatchVariables` makes it
 * so, and because a `catch` is the one input with no schema to decode it against.
 * It is the single parameter name anti-slop exempts, for that reason.
 */
export type CauseOf = (cause: unknown) => string;

/**
 * Whether a caught error means the path was simply not there.
 *
 * Every caller of this asks the same question — an absent file is a state, and
 * every other failure to read one is a problem. Nothing else about a Node error
 * is worth a shared name until a second question is asked twice.
 */
export type IsMissing = (cause: unknown) => boolean;

/**
 * Rendering one declared value as the line a person reads.
 *
 * Every module renders its own — `cli` prints what a module hands it and never
 * knows what can go wrong inside it. The shape of that job was written out eight
 * times; it is written here once, and each module still names its own in its own
 * `types.ts`, so a reader still learns the whole interface from one file.
 *
 * It is not only for a Failure. `channel` renders pairing progress with it, which
 * is the same job — one declared value in, one line out.
 */
export type Describe<D> = (detail: D) => string;
