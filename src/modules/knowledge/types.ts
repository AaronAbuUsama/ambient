/**
 * `knowledge` — the knowledge base on disk: the layout, the frontmatter codec and
 * validation against the ontology.
 *
 * THE interface. Read this file alone and you know what `knowledge` is.
 * `service.ts` implements it; `internal/` is what only `knowledge` knows.
 *
 * **It is files, not a client** ([ADR 007](../../../docs/adr/007-knowledge-is-files-not-a-client.md)).
 * Nothing here spawns `ok`, opens a socket or knows a path: the base is reached
 * through a `Place` `home` granted, exactly as `blobs` is.
 *
 * **Every way `knowledge` can refuse is a `ViolationDetail` below.** Nothing in
 * this module throws — narrow anything that can fail with `"problems" in result`.
 */

import type { Describe, Problems } from "~/modules/failure/types.ts";
import type { Place, Schema } from "~/modules/home/types.ts";

// ── what a document holds ─────────────────────────────────────────────

/**
 * What one frontmatter key may hold.
 *
 * Closed, because `schema.yaml`'s field forms are: `text`, `ref`, `date` and
 * `enum(…)` are one string, `text[]` and `ref[]` are a list of them, and there is
 * no seventh form for a user to add. So a decoded document carries a domain type
 * and never `unknown` — [ADR 006](../../../docs/adr/006-schema-is-the-parse-boundary.md).
 */
export type Field = string | readonly string[];

/** The YAML block above the fence, decoded. Its keys are the ontology's, plus `type`. */
export type Frontmatter = Readonly<Record<string, Field>>;

/**
 * A document as it exists on disk: typed frontmatter plus its prose.
 *
 * `at` is where it is, base-relative — for a person to read and for a `Violation`
 * to name. **Identity is `(type, name)`, never `at`**: refusing by filename
 * silently duplicates, which a failing assertion in the step-3 spike found.
 */
export type Document = {
  readonly at: string;
  /** A type name from `schema.yaml`. */
  readonly type: string;
  /** The identity half. Read from the frontmatter, never derived from `at`. */
  readonly name: string;
  readonly frontmatter: Frontmatter;
  readonly body: string;
};

// ── errors: one vocabulary, everywhere ────────────────────────────────

/**
 * What is wrong with one document.
 *
 * One union rather than one for the bytes and one for the ontology, because the
 * base's contract is one sentence: every `.md` file under it is a document
 * conforming to `schema.yaml`. A caller that would have to handle *unreadable*
 * and *missing a required field* differently has not been given a reason to.
 */
export type ViolationDetail =
  /** The filesystem refused a read or a listing. `cause` is the OS message. */
  | { readonly _tag: "Unreadable"; readonly cause: string }
  /** No `---` fence, so there is no frontmatter to decode and no document here. */
  | { readonly _tag: "NoFrontmatter" }
  /**
   * Not a regular file. The `Place` is the grant: a symlink is how a path inside it
   * addresses bytes outside it, and a FIFO is how one stops answering. Both are
   * refused unread — the link never followed, the pipe never waited on. `home` calls
   * the first of these `Escapes`, and the name covers both.
   */
  | { readonly _tag: "Escapes" }
  /** The YAML block will not parse. `line` counts from the top of the **file**. */
  | {
      readonly _tag: "Malformed";
      readonly line: number;
      readonly column?: number;
      readonly detail: string;
    }
  | { readonly _tag: "UnknownType"; readonly type: string; readonly known: readonly string[] }
  /** `expected` is the field's form — what gate row 8 requires a person be told. */
  | { readonly _tag: "MissingKey"; readonly key: string; readonly expected: string }
  /** Named, unlike OpenKnowledge's own `additionalProperties` diagnostic. */
  | { readonly _tag: "UnknownKey"; readonly key: string; readonly known: readonly string[] }
  | {
      readonly _tag: "BadValue";
      readonly key: string;
      readonly expected: string;
      readonly got: string;
    };

/** A problem and the document it is in. `at` is base-relative — `person/zeeshan.md`. */
export type Violation = { readonly at: string; readonly detail: ViolationDetail };

/** Why `knowledge` said no. Narrow with `"problems" in result`. */
export type KnowledgeProblem = Problems<Violation>;

// ── the base ──────────────────────────────────────────────────────────

/**
 * A handle over the knowledge base. `open` builds no path and reads nothing —
 * the `Place` is the whole grant, exactly as it is for `blobs`.
 */
export type Base = {
  /**
   * Every document under the base, or every reason one of them is not a document.
   *
   * It collects **every** problem rather than stopping at the first, for the same
   * reason `home`'s config reader does: a person repairing a base wants the whole
   * list at one time, not one round trip per file. `.ok/` is never read — it is
   * OpenKnowledge's own scaffold and holds no documents.
   */
  all(): Promise<readonly Document[] | KnowledgeProblem>;
};

export type Open = (place: Place) => Base;

/**
 * The ontology check. **Pure** — a list in, a value out. No I/O, no clock.
 *
 * It consumes the `Schema` value `home.read()` already returns and does **not**
 * re-parse `schema.yaml`: `home` owns that file and already decodes it.
 */
export type Lint = (schema: Schema, docs: readonly Document[]) => readonly Violation[];

/** Rendering lives here, not in `cli`. */
export type DescribeViolation = Describe<Violation>;

// ── the work queue ───────────────────────────────────────────────────

/**
 * What `next` narrows to, beyond the status the queue is defined by. `type`
 * matches `Document.type` case-insensitively, so `--type=person` reaches
 * `Person` without a folder-naming table — that mapping is `write`'s to own,
 * not the queue's.
 */
export type Query = { readonly type?: string; readonly limit?: number };

/**
 * The work queue. **Pure** — a list in, a value out. It filters
 * `status: unreviewed` and nothing else: that is what lets a quiet day be
 * cheap — nothing unreviewed, nothing printed, nothing spent.
 */
export type Next = (docs: readonly Document[], query: Query) => readonly Document[];

/** One line per document, for the work queue. */
export type DescribeDocument = Describe<Document>;

// ── the derived index ────────────────────────────────────────────────

/** One row in the derived index — enough to say what is in the base without re-reading it. */
export type IndexRow = { readonly at: string; readonly type: string; readonly name: string };

/**
 * The derived read model. **Frontmatter is truth and this is disposable**:
 * deleting it and rebuilding from the same documents must reproduce it
 * byte-identically, or it is not actually derived
 * ([design.md § B2](../../../docs/planning/knowledge/design.md)).
 */
export type Index = {
  readonly documents: readonly IndexRow[];
  readonly counts: Readonly<Record<string, number>>;
};

/** **Pure** — a list in, a value out. No I/O, no clock. */
export type BuildIndex = (docs: readonly Document[]) => Index;

/** Why writing the derived index failed. `cause` is the OS message. */
export type IndexFailure = { readonly cause: string };

/** Narrow with `"problems" in result`. */
export type IndexProblem = Problems<IndexFailure>;

export type Written = { readonly bytes: number };

/**
 * Writes to `home.index`, **outside** the knowledge base, as a single `rename`
 * — the same shape every write in this Slice uses, and the reason ADR 007
 * gives for all of them: a non-atomic edit registers a phantom document in
 * OpenKnowledge's removal ledger.
 *
 * It takes the `Place` explicitly rather than hanging off `Base`: a `Base`'s
 * one invariant is that the `Place` it was opened with is the whole grant, and
 * the index lives outside that grant on purpose.
 */
export type WriteIndex = (place: Place, index: Index) => Promise<Written | IndexProblem>;

/** Rendering lives here, not in `cli`. */
export type DescribeIndexFailure = Describe<IndexFailure>;
