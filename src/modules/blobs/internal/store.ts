import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";

import type { Place } from "~/modules/home/types.ts";
import type { BlobBytes, BlobHash, BlobProblem, PutBlobResult } from "../types.ts";
import { hasher, legalHash } from "./hash.ts";

/** The one question this module asks of a caught error: was the file simply absent? */
const isMissing = (cause: unknown): boolean =>
  cause instanceof Error && "code" in cause && cause.code === "ENOENT";

const causeOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

/** The root Place is the authority; only hash and private incoming leaves exist beneath it. */
const at = (root: Place, leaf: string): string => `${root.path}/${leaf}`;

const badHash = (hash: string): BlobProblem | undefined =>
  legalHash(hash) ? undefined : { problems: [{ _tag: "BadHash", hash }] };

const chunksOf = (bytes: BlobBytes): AsyncIterable<Uint8Array> => {
  if (!(bytes instanceof Uint8Array)) return bytes;
  return (async function* () {
    yield bytes;
  })();
};

export const put = async (root: Place, source: BlobBytes): Promise<PutBlobResult | BlobProblem> => {
  const incoming = at(root, `.incoming-${randomUUID()}`);
  let handle: fs.FileHandle | undefined;
  try {
    handle = await fs.open(incoming, "wx");
    const hash = hasher();
    let bytes = 0;
    for await (const chunk of chunksOf(source)) {
      hash.update(chunk);
      bytes += chunk.byteLength;
      await handle.writeFile(chunk);
    }
    await handle.close();
    handle = undefined;
    const address = hash.digest("hex");
    const destination = at(root, address);
    try {
      await fs.access(destination);
      await fs.unlink(incoming);
      return { hash: address, bytes, stored: false };
    } catch (cause: unknown) {
      if (!isMissing(cause)) {
        await fs.unlink(incoming).catch(() => undefined);
        return { problems: [{ _tag: "Unreadable", cause: causeOf(cause) }] };
      }
    }
    await fs.rename(incoming, destination);
    return { hash: address, bytes, stored: true };
  } catch (cause: unknown) {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch {}
    }
    try {
      await fs.unlink(incoming);
    } catch {}
    return { problems: [{ _tag: "Unwritable", cause: causeOf(cause) }] };
  }
};

export const get = async (root: Place, hash: BlobHash): Promise<Uint8Array | BlobProblem> => {
  const invalid = badHash(hash);
  if (invalid !== undefined) return invalid;
  try {
    return Uint8Array.from(await fs.readFile(at(root, hash)));
  } catch (cause: unknown) {
    return isMissing(cause)
      ? { problems: [{ _tag: "Missing", hash }] }
      : { problems: [{ _tag: "Unreadable", cause: causeOf(cause) }] };
  }
};

export const exists = async (root: Place, hash: BlobHash): Promise<boolean | BlobProblem> => {
  const invalid = badHash(hash);
  if (invalid !== undefined) return invalid;
  try {
    await fs.access(at(root, hash));
    return true;
  } catch (cause: unknown) {
    return isMissing(cause) ? false : { problems: [{ _tag: "Unreadable", cause: causeOf(cause) }] };
  }
};
