/**
 * YAML in, `unknown` out, then narrowed one key at a time.
 *
 * Every narrower takes an `Out` accumulator, pushes what is wrong and returns
 * `undefined` — so a caller collects every problem in a file rather than
 * stopping at the first, and never needs a type assertion to proceed.
 */

import { parseDocument } from "yaml";

import type { Checked } from "./problem.ts";
import type { ProblemDetail } from "../types.ts";

export type Out = ProblemDetail[];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** What a human sees in `got "…"`. Never a stringified object. */
export const show = (v: unknown): string => {
  if (v === null || v === undefined) return "nothing";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  if (Array.isArray(v)) return "a list";
  return typeof v === "object" ? "a mapping" : typeof v;
};

export const record = (out: Out, key: string, v: unknown): Record<string, unknown> | undefined => {
  if (isRecord(v)) return v;
  out.push({ _tag: "BadValue", key, expected: "a mapping", got: show(v) });
  return undefined;
};

export const text = (out: Out, key: string, v: unknown): string | undefined => {
  if (typeof v === "string") return v;
  out.push({ _tag: "BadValue", key, expected: "text", got: show(v) });
  return undefined;
};

export const textList = (out: Out, key: string, v: unknown): readonly string[] | undefined => {
  if (!Array.isArray(v)) {
    out.push({ _tag: "BadValue", key, expected: "a list of text", got: show(v) });
    return undefined;
  }
  const items: string[] = [];
  let good = true;
  for (const [i, item] of v.entries()) {
    const s = text(out, `${key}[${i}]`, item);
    if (s === undefined) good = false;
    else items.push(s);
  }
  return good ? items : undefined;
};

export const textMap = (
  out: Out,
  key: string,
  v: unknown,
): Readonly<Record<string, string>> | undefined => {
  const rec = record(out, key, v);
  if (rec === undefined) return undefined;
  const map: Record<string, string> = {};
  let good = true;
  for (const [k, item] of Object.entries(rec)) {
    const s = text(out, `${key}.${k}`, item);
    if (s === undefined) good = false;
    else map[k] = s;
  }
  return good ? map : undefined;
};

export const oneOf = <T extends string>(
  out: Out,
  key: string,
  v: unknown,
  of: readonly T[],
): T | undefined => {
  const hit = of.find((o) => o === v);
  if (hit !== undefined) return hit;
  out.push({ _tag: "BadValue", key, expected: `one of ${of.join("|")}`, got: show(v) });
  return undefined;
};

/** Fail-closed: an unknown key is a named problem, never a silent default. */
export const unknownKeys = (
  out: Out,
  prefix: string,
  rec: Record<string, unknown>,
  known: readonly string[],
): void => {
  for (const k of Object.keys(rec)) {
    if (!known.includes(k)) out.push({ _tag: "UnknownKey", key: prefix + k, known });
  }
};

export const need = <T>(
  out: Out,
  prefix: string,
  rec: Record<string, unknown>,
  key: string,
  read: (v: unknown) => T | undefined,
): T | undefined => {
  if (!(key in rec)) {
    out.push({ _tag: "MissingKey", key: prefix + key });
    return undefined;
  }
  return read(rec[key]);
};

const firstLine = (message: string): string =>
  (message.split("\n")[0] ?? message).replace(/ at line \d+, column \d+:?$/, "");

/** With line and column when it will not parse. */
export const parseYaml = (src: string): Checked<unknown> => {
  const doc = parseDocument(src, { prettyErrors: true });
  if (doc.errors.length > 0) {
    return {
      problems: doc.errors.map((e) => ({
        _tag: "Malformed" as const,
        line: e.linePos?.[0].line ?? 1,
        column: e.linePos?.[0].col,
        detail: `malformed YAML — ${firstLine(e.message)}`,
      })),
    };
  }
  return { value: doc.toJS() };
};

/** A value only when nothing went wrong, and never an empty failure. */
export const done = <T>(out: Out, value: T | undefined): Checked<T> => {
  if (value !== undefined && out.length === 0) return { value };
  if (out.length === 0) out.push({ _tag: "BadValue", key: "", expected: "complete", got: "" });
  return { problems: out };
};
