import { createHash } from "node:crypto";

export const hasher = () => createHash("sha256");

export const legalHash = (hash: string): boolean => /^[a-f0-9]{64}$/.test(hash);
