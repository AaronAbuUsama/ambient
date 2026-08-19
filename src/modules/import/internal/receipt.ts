/**
 * The import Receipt, and the atomic writes that persist it.
 *
 * **The Receipt describes the import, not the last run.** An earlier version rewrote it on
 * every re-import, so a second identical run left `linesWritten: 0` sitting beside a
 * 13,134-line Transcript — a provenance record saying the Transcript came from somewhere
 * else. The run that wrote the lines is the one worth keeping; later runs append to
 * `reruns` and change nothing else.
 */

import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";

export interface ReceiptCounts {
  readonly messages: number;
  readonly events: number;
  readonly placeholders: number;
  readonly markers: number;
  readonly resolved: number;
  readonly unresolved: number;
}

export interface ReceiptInput {
  readonly dir: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly form: string;
  readonly readerVersion: number;
  readonly zone: { readonly name: string; readonly given: boolean };
  readonly primary: Uint8Array | string;
  readonly counts: ReceiptCounts;
  readonly span: unknown;
  readonly written: number;
  readonly skipped: number;
  readonly messagesWritten: number;
  readonly messagesSkipped: number;
  readonly findings: readonly unknown[];
}

const causeOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

/**
 * Temp-then-rename, so a file is old or new and never torn.
 *
 * `exclusive` is the difference between the two writes here: the primary source must never
 * be replaced (`wx` refuses a second write), while a Receipt is deliberately rewritten when
 * a re-run appends to it.
 */
const atomic = async (
  target: string,
  bytes: Uint8Array | string,
  exclusive: boolean,
): Promise<string | undefined> => {
  const temporary = `${target}.tmp-${randomUUID()}`;
  try {
    await fs.writeFile(temporary, bytes, exclusive ? { flag: "wx" } : {});
    await fs.rename(temporary, target);
    return undefined;
  } catch (cause: unknown) {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    return causeOf(cause);
  }
};

/** A Receipt already on disk, or undefined when this Archive is new here. */
const existing = async (at: string): Promise<Record<string, unknown> | undefined> => {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(at, "utf8"));
    // SAFETY: the guard on this line has established that `parsed` is a non-null
    // object, and `Record<string, unknown>` claims nothing more than that — a read
    // by string key yields `unknown`, which holds for every non-null object, arrays
    // included. It does not claim the keys of a Receipt: the only two reads,
    // `...prior` and `prior["reruns"]`, keep their values `unknown` and the second
    // is narrowed by `toReruns` before use. A hand-edited or torn receipt.json is a
    // wrong Receipt, never an unsound type.
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    // Absent, or torn by a kill mid-write. Either way this run writes a fresh one.
    return undefined;
  }
};

/**
 * Persist the primary source and the Receipt.
 *
 * Returns the cause when either write fails, and `rerun` so the caller can report it.
 */
export async function persist(
  input: ReceiptInput,
  stamp: string,
): Promise<{ readonly cause?: string; readonly rerun: boolean }> {
  try {
    await fs.mkdir(input.dir, { recursive: true });
  } catch (cause: unknown) {
    return { cause: causeOf(cause), rerun: false };
  }

  const at = `${input.dir}/receipt.json`;
  const prior = await existing(at);
  const rerun = prior !== undefined;

  // The primary source is byte-identical every time, so writing it once is enough — and
  // `wx` would refuse the second write anyway.
  const primaryCause = rerun
    ? undefined
    : await atomic(`${input.dir}/_chat.txt`, input.primary, true);
  if (primaryCause !== undefined) return { cause: primaryCause, rerun };

  const receipt = rerun
    ? {
        ...prior,
        reruns: [
          ...toReruns(prior["reruns"]),
          { at: stamp, written: input.written, skipped: input.skipped },
        ],
      }
    : {
        archive: { sha256: input.sha256, bytes: input.bytes, form: input.form },
        reader: { version: input.readerVersion },
        zone: { name: input.zone.name, source: input.zone.given ? "given" : "default" },
        transcript: {
          messagesWritten: input.messagesWritten,
          messagesSkipped: input.messagesSkipped,
          linesWritten: input.written,
          linesSkipped: input.skipped,
          span: input.span,
        },
        counts: input.counts,
        findings: input.findings,
        reruns: [],
      };

  const cause = await atomic(at, `${JSON.stringify(receipt, undefined, 2)}\n`, false);
  return cause === undefined ? { rerun } : { cause, rerun };
}

const toReruns = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
