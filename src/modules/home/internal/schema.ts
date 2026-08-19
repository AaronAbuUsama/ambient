/**
 * `schema.yaml` — the ontology. A closed field vocabulary over an open type
 * space: users add types, users cannot add field forms. That single distinction
 * is what keeps per-install extension from becoming a plugin system, and it is
 * what `doctor` enforces.
 *
 * Validated for legality here and used by nothing in SKELETON — shape before
 * content. KNOWLEDGE is where it is read.
 *
 * **The document's shape is a schema; a field's form is not.** `Schema` decodes
 * "a mapping of type name to a mapping of field name to text", which is every
 * structural thing that can be wrong. What a *form* means — `text[]`, `ref`,
 * `enum(a|b)`, optionally suffixed `?` — is a grammar over one string, so it
 * stays a regex. `form` arrives here already known to be text, which is why
 * nothing below asks what type it is.
 */

import * as Schema from "effect/Schema";

import type { Checked } from "./problem.ts";
import { decodeYaml } from "./yaml.ts";
import type { ProblemDetail, Schema as Ontology, SchemaField, SchemaType } from "../types.ts";

const FORM = /^(text\[\]|ref\[\]|text|ref|date|enum\([^()|]+(\|[^()|]+)*\))(\?)?$/;
const FORMS = "text · text[] · ref · ref[] · date · enum(a|b|c), optionally suffixed with ?";

/** A mapping of type name to a mapping of field name to form. */
const OntologyDocument = Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.String));

const fieldForm = (
  out: ProblemDetail[],
  key: string,
  form: string,
): SchemaField["type"] | undefined => {
  const matched = FORM.exec(form);
  if (matched === null) {
    out.push({ _tag: "BadValue", key, expected: FORMS, got: form });
    return undefined;
  }
  const head = matched[1];
  if (head.startsWith("enum(")) {
    return {
      form: "enum",
      of: head
        .slice(5, -1)
        .split("|")
        .map((value) => value.trim()),
    };
  }
  const plain = ["text", "text[]", "ref", "ref[]", "date"] as const;
  return { form: plain.find((candidate) => candidate === head) ?? "text" };
};

/** Users add types. Users cannot add field forms — that is the whole distinction. */
export const readSchema = (src: string): Checked<Ontology> => {
  const decoded = decodeYaml(OntologyDocument, src);
  if ("problems" in decoded) return decoded;

  const out: ProblemDetail[] = [];
  const types: SchemaType[] = [];
  for (const [name, declared] of Object.entries(decoded.value)) {
    const fields: SchemaField[] = [];
    for (const [field, form] of Object.entries(declared)) {
      const type = fieldForm(out, `${name}.${field}`, form);
      if (type !== undefined) fields.push({ name: field, type, optional: form.endsWith("?") });
    }
    types.push({ name, fields });
  }
  return out.length > 0 ? { problems: out } : { value: { types } };
};
