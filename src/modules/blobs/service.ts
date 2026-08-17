/** `blobs` assembly. The interface is `types.ts`. */

import { exists, get, put } from "./internal/store.ts";
import type { DescribeBlobProblem, OpenBlobs } from "./types.ts";

export const openBlobs: OpenBlobs = (root) => ({
  put: (bytes) => put(root, bytes),
  get: (hash) => get(root, hash),
  exists: (hash) => exists(root, hash),
});

export const describe: DescribeBlobProblem = (problem) => {
  switch (problem._tag) {
    case "BadHash":
      return `Invalid Blob hash "${problem.hash}"`;
    case "Missing":
      return `Blob ${problem.hash} is missing`;
    case "Unreadable":
      return `Blob is unreadable: ${problem.cause}`;
    case "Unwritable":
      return `Blob is unwritable: ${problem.cause}`;
  }
};
