import * as fs from "node:fs/promises";
import { buffer } from "node:stream/consumers";
import { openPromise, type Entry, type ZipFile } from "yauzl";

import type { ArchiveMediaEntry, ArchiveProblem, ArchiveProblemDetail } from "../types.ts";

type OpenedZip = {
  readonly form: "zip-text" | "zip-media";
  readonly text: string;
  readonly primary: Uint8Array;
  readonly bytes: number;
  readonly media: readonly ArchiveMediaEntry[];
  readonly close: () => void;
};

const failed = (detail: ArchiveProblemDetail): ArchiveProblem => ({ problems: [detail] });
const causeOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const nameOf = (entry: Entry): string | ArchiveProblem => {
  try {
    // Measured real export: 0/1,140 entries set ZIP's UTF-8 bit; all raw names are UTF-8.
    return new TextDecoder("utf-8", { fatal: true }).decode(entry.fileNameRaw);
  } catch {
    return failed({ _tag: "InvalidFilename" });
  }
};

const unsafe = (name: string): boolean =>
  name === "." || name === ".." || name.includes("/") || name.includes("\\");

const openedStream = async (
  zip: ZipFile,
  entry: Entry,
): Promise<AsyncIterable<Uint8Array> | ArchiveProblem> => {
  try {
    return (await zip.openReadStreamPromise(entry)) as AsyncIterable<Uint8Array>;
  } catch (cause: unknown) {
    return failed({ _tag: "InvalidZip", cause: causeOf(cause) });
  }
};

const primaryOf = async (zip: ZipFile, entry: Entry): Promise<Uint8Array | ArchiveProblem> => {
  try {
    return Uint8Array.from(await buffer(await zip.openReadStreamPromise(entry)));
  } catch (cause: unknown) {
    return failed({ _tag: "InvalidZip", cause: causeOf(cause) });
  }
};

const textOf = (primary: Uint8Array): string | ArchiveProblem => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(primary);
  } catch {
    return failed({ _tag: "InvalidText" });
  }
};

export const looksLikeZip = async (path: string): Promise<boolean | ArchiveProblem> => {
  let handle: fs.FileHandle | undefined;
  try {
    handle = await fs.open(path, "r");
    const prefix = Buffer.alloc(4);
    const { bytesRead } = await handle.read(prefix, 0, prefix.byteLength, 0);
    if (bytesRead < 4) return false;
    const signature = prefix.readUInt32LE(0);
    return signature === 0x04034b50 || signature === 0x06054b50 || signature === 0x08074b50;
  } catch (cause: unknown) {
    return failed({ _tag: "Unreadable", cause: causeOf(cause) });
  } finally {
    await handle?.close().catch(() => undefined);
  }
};

export const openZip = async (path: string): Promise<OpenedZip | ArchiveProblem> => {
  let zip: ZipFile | undefined;
  try {
    const stat = await fs.stat(path);
    zip = await openPromise(path, { autoClose: false, decodeStrings: false });
    const archive = zip;
    const named: { readonly entry: Entry; readonly name: string }[] = [];
    for await (const entry of archive.eachEntry()) {
      const name = nameOf(entry);
      if (typeof name !== "string") {
        archive.close();
        return name;
      }
      if (name.endsWith("/")) continue;
      if (unsafe(name)) {
        archive.close();
        return failed({ _tag: "UnsafeEntry", name });
      }
      named.push({ entry, name });
    }
    const transcript =
      named.length === 1 ? named[0] : named.find(({ name }) => name === "_chat.txt");
    if (transcript === undefined) {
      archive.close();
      return failed({ _tag: "MissingChatText" });
    }
    const primary = await primaryOf(archive, transcript.entry);
    if (!(primary instanceof Uint8Array)) {
      archive.close();
      return primary;
    }
    const source = textOf(primary);
    if (typeof source !== "string") {
      archive.close();
      return source;
    }
    const media = named
      .filter(({ entry }) => entry !== transcript.entry)
      .map(
        ({ entry, name }): ArchiveMediaEntry => ({
          name,
          bytes: entry.uncompressedSize,
          open: () => openedStream(archive, entry),
        }),
      );
    return {
      form: media.length === 0 ? "zip-text" : "zip-media",
      text: source,
      primary,
      bytes: stat.size,
      media,
      close: () => archive.close(),
    };
  } catch (cause: unknown) {
    zip?.close();
    return failed({ _tag: "InvalidZip", cause: causeOf(cause) });
  }
};
