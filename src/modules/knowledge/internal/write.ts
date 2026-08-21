/**
 * One Observation, checked against the ontology and written as a single `rename`.
 *
 * The only file in `knowledge` that writes anything. Reading lives in
 * `documents.ts`; this reuses `lint.ts`'s `violationsIn` rather than a second
 * check of the same fields — the ontology is checked once, wherever a
 * `Frontmatter` value comes from.
 */

import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";

import { stringify } from "yaml";

import { causeOf } from "~/modules/failure/service.ts";
import type { Place, Schema } from "~/modules/home/types.ts";
import { violationsIn } from "./lint.ts";
import type {
  Document,
  Frontmatter,
  Observation,
  Refusal,
  Violation,
  WriteReport,
} from "../types.ts";

/**
 * Declared, not derived (Implementation Decision 4): `Person` → `person/`, never
 * `people/`. A lowercase of the type name would happen to agree today, but this
 * is what is authoritative, not the transform — a `switch` over a `Record` so a
 * type outside it types as `undefined` rather than as any `string` index would.
 */
const folderOf = (type: string): string | undefined => {
  switch (type) {
    case "Person":
      return "person";
    case "Organization":
      return "organization";
    case "Commitment":
      return "commitment";
    case "Issue":
      return "issue";
    case "Media":
      return "media";
    case "Chat":
      return "chat";
    default:
      return undefined;
  }
};

// ponytail: two distinct names whose slugs collide would overwrite one another on
// `rename` — not guarded here because no shipped label does (unicode and `~` are
// kept, never stripped, so `"P4"` and `"~ P4"` slug to `"p4"` and `"~-p4"`, not
// the same string). Add a pre-rename existence check if that stops holding.
const slugOf = (name: string): string => {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[/\s]+/g, "-");
  return cleaned.length > 0 ? cleaned : "unnamed";
};

/**
 * One Observation, checked. `at` is `${type}/${name}` because there is no path
 * yet — nothing has reached disk. `type` and `name` join the Observation's own
 * `frontmatter` exactly as `documents.ts` finds them in a file's YAML block,
 * so the same `SchemaType` check applies identically either way.
 */
const checked = (
  schema: Schema,
  observation: Observation,
): { readonly document: Document } | { readonly violations: readonly Violation[] } => {
  const at = `${observation.type}/${observation.name}`;
  const frontmatter: Frontmatter = {
    type: observation.type,
    name: observation.name,
    ...observation.frontmatter,
  };
  // No prose — a reasoning pass writes that later.
  const document: Document = {
    at,
    type: observation.type,
    name: observation.name,
    frontmatter,
    body: "",
  };
  const violations = violationsIn(schema, document);
  return violations.length > 0 ? { violations } : { document };
};

/** `type` and `name` first, matching how `documents.ts` reads them back out. */
const bytesOf = (document: Document): string =>
  `---\n${stringify(document.frontmatter).replace(/\n$/, "")}\n---\n`;

const writeOne = async (root: Place, document: Document): Promise<Violation | undefined> => {
  const folder = folderOf(document.type);
  if (folder === undefined)
    return { at: document.at, detail: { _tag: "NoFolder", type: document.type } };

  const dir = `${root.path}/${folder}`;
  const slug = slugOf(document.name);
  const dest = `${dir}/${slug}.md`;
  const tmp = `${dir}/.${slug}.tmp-${randomUUID()}`;
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tmp, bytesOf(document), { encoding: "utf8", flag: "wx" });
    await fs.rename(tmp, dest);
    return undefined;
  } catch (cause: unknown) {
    await fs.rm(tmp, { force: true }).catch(() => undefined);
    return { at: document.at, detail: { _tag: "Unreadable", cause: causeOf(cause) } };
  }
};

export const writeObservations = async (
  root: Place,
  schema: Schema,
  observations: readonly Observation[],
): Promise<WriteReport> => {
  const wrote: string[] = [];
  const refused: Refusal[] = [];
  for (const observation of observations) {
    const result = checked(schema, observation);
    if ("violations" in result) {
      refused.push(...result.violations.map((v): Refusal => ({ at: v.at, why: v.detail })));
      continue;
    }
    const failure = await writeOne(root, result.document);
    if (failure === undefined) wrote.push(result.document.at);
    else refused.push({ at: failure.at, why: failure.detail });
  }
  return { wrote, refused };
};
