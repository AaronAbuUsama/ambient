/**
 * `schema.yaml` — the ontology. A closed field vocabulary over an open type
 * space: users add types, users cannot add field forms. That single distinction
 * is what keeps per-install extension from becoming a plugin system, and it is
 * what `doctor` enforces.
 *
 * Validated for legality here and used by nothing in SKELETON — shape before
 * content. KNOWLEDGE is where it is read.
 */

import type { Checked } from "./problem.ts";
import type { Out } from "./yaml.ts";
import { parseYaml, record, show } from "./yaml.ts";
import type { Schema, SchemaField, SchemaType } from "../types.ts";

const FORM = /^(text\[\]|ref\[\]|text|ref|date|enum\([^()|]+(\|[^()|]+)*\))(\?)?$/;
const FORMS = "text · text[] · ref · ref[] · date · enum(a|b|c), optionally suffixed with ?";

const fieldForm = (out: Out, key: string, v: unknown): SchemaField["type"] | undefined => {
  const raw = typeof v === "string" ? v : undefined;
  const m = raw === undefined ? null : FORM.exec(raw);
  if (m === null) {
    out.push({ _tag: "BadValue", key, expected: FORMS, got: show(v) });
    return undefined;
  }
  const head = m[1];
  if (head.startsWith("enum(")) {
    return {
      form: "enum",
      of: head
        .slice(5, -1)
        .split("|")
        .map((s) => s.trim()),
    };
  }
  const plain = ["text", "text[]", "ref", "ref[]", "date"] as const;
  return { form: plain.find((p) => p === head) ?? "text" };
};

/** Users add types. Users cannot add field forms — that is the whole distinction. */
export const readSchema = (src: string): Checked<Schema> => {
  const parsed = parseYaml(src);
  if ("problems" in parsed) return parsed;
  const out: Out = [];
  const root = record(out, "", parsed.value);
  if (root === undefined) return { problems: out };
  const types: SchemaType[] = [];
  for (const [name, v] of Object.entries(root)) {
    const r = record(out, name, v);
    if (r === undefined) continue;
    const fields: SchemaField[] = [];
    for (const [field, form] of Object.entries(r)) {
      const optional = typeof form === "string" && form.endsWith("?");
      const type = fieldForm(out, `${name}.${field}`, form);
      if (type !== undefined) fields.push({ name: field, type, optional });
    }
    types.push({ name, fields });
  }
  return out.length > 0 ? { problems: out } : { value: { types } };
};
