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

// Unicode and `~` are kept, never stripped, so `"P4"` and `"~ P4"` reach `"p4"` and
// `"~-p4"` rather than one string. It is still **not injective** — `"A B"` and `"A/B"`
// both reach `"a-b"` — and a name comes from a Transcript, so which pair arrives is not
// ours to choose. Collisions are refused, in `writeObservations` within a pass and by
// `link`'s own `EEXIST` against what is already on disk.
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
  // Identity is dropped from the proposal, then written first. Spreading the proposal
  // over it lets a `frontmatter.type` from the Transcript overwrite the identity that
  // chose the folder and the filename, so the bytes would name one document and the path
  // another. Spreading it *after* identity fixes that but moves `type` and `name` to the
  // end, and `bytesOf` puts them first on purpose — `documents.ts` reads them back from
  // the top. Removing them from the proposal is the only order that keeps both.
  const proposed = Object.fromEntries(
    Object.entries(observation.frontmatter).filter(([key]) => key !== "type" && key !== "name"),
  );
  const frontmatter: Frontmatter = {
    type: observation.type,
    name: observation.name,
    ...proposed,
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
  const escaped = { at: document.at, detail: { _tag: "Escapes" } } as const;

  try {
    await fs.mkdir(dir, { recursive: true });

    // `realpath` and not `lstat`: it resolves every component, so a symlinked
    // `knowledge/person` and a symlinked ancestor are both caught, where `lstat` sees
    // only the last one. Checked before the temp file, because a temp file inside a
    // linked folder is already outside the grant.
    //
    // **This is a check, not a proof.** It says where `dir` pointed at that instant; an
    // attacker with write access to the home can swap it before the two calls below
    // resolve the path again. Closing that needs `openat` against a held directory
    // handle, and Node exposes no way to write relative to one. So the durable case — a
    // linked folder sitting in the base — is refused, the window is narrow, and the
    // publish is verified again below rather than trusted.
    const here = await fs.realpath(dir);
    const base = await fs.realpath(root.path);
    if (here !== base && !here.startsWith(`${base}/`)) return escaped;

    await fs.writeFile(tmp, bytesOf(document), { encoding: "utf8", flag: "wx" });

    // `link` and not `rename`: `rename` replaces its destination silently, and the
    // destination is derived from a name the Transcript chose. `link` fails with EEXIST
    // instead, so an existing document — a hand-edited one especially — is never
    // destroyed by a slug that happens to match it. The document still appears complete
    // in one step, which is what Implementation Decision 5 is actually about.
    //
    // Only THIS call turns EEXIST into a collision. `mkdir` throws EEXIST when
    // `knowledge/person` is a regular file, and the temp write throws it on a UUID
    // clash; neither says anything about `dest`, and reporting them as a taken slug
    // names a destination nothing looked at.
    const published = await fs.link(tmp, dest).then(
      () => undefined,
      (cause: unknown) => cause,
    );
    if (published !== undefined) {
      const taken =
        published instanceof Error && "code" in published && published.code === "EEXIST";
      return taken
        ? {
            at: document.at,
            detail: {
              _tag: "Collides",
              slug: `${folder}/${slug}.md`,
              with: "a document already on disk",
            },
          }
        : { at: document.at, detail: { _tag: "Unreadable", cause: causeOf(published) } };
    }

    // The path resolved once more, after the bytes landed. If `dir` was swapped between
    // the check above and here, this is where it shows — and the link is removed rather
    // than left somewhere the grant does not reach.
    const landed = await fs.realpath(dest);
    if (!landed.startsWith(`${base}/`)) {
      await fs.rm(dest, { force: true }).catch(() => undefined);
      return escaped;
    }
    return undefined;
  } catch (cause: unknown) {
    return { at: document.at, detail: { _tag: "Unreadable", cause: causeOf(cause) } };
  } finally {
    await fs.rm(tmp, { force: true }).catch(() => undefined);
  }
};

export const writeObservations = async (
  root: Place,
  schema: Schema,
  observations: readonly Observation[],
): Promise<WriteReport> => {
  const wrote: string[] = [];
  const refused: Refusal[] = [];
  /** slug → the identity that reached it first, so the second is told who has it. */
  const claimed = new Map<string, string>();

  for (const observation of observations) {
    const result = checked(schema, observation);
    if ("violations" in result) {
      refused.push(...result.violations.map((v): Refusal => ({ at: v.at, why: v.detail })));
      continue;
    }

    // Within one pass, before anything reaches disk. `link` catches a collision with a
    // document already on disk; this catches two proposals in the same run, which would
    // otherwise be one file and two entries in `wrote` — a report that says both were
    // written when one was destroyed.
    const document = result.document;
    const folder = folderOf(document.type);
    const key = folder === undefined ? undefined : `${folder}/${slugOf(document.name)}.md`;
    const owner = key === undefined ? undefined : claimed.get(key);
    if (key !== undefined && owner !== undefined) {
      refused.push({ at: document.at, why: { _tag: "Collides", slug: key, with: owner } });
      continue;
    }

    const failure = await writeOne(root, document);
    if (failure === undefined) {
      if (key !== undefined) claimed.set(key, document.at);
      wrote.push(document.at);
    } else refused.push({ at: failure.at, why: failure.detail });
  }
  return { wrote, refused };
};
