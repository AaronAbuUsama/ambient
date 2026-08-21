/**
 * The ontology check: one document's frontmatter against one `SchemaType`.
 *
 * **It re-parses nothing.** `home` already decodes `schema.yaml` into a `Schema`
 * value and hands it out on `global.schema`; this file consumes that value. A
 * second parser is a second place for the ontology to be wrong.
 *
 * **Every violation names the offending key.** OpenKnowledge's own `lint` reports
 * `additionalProperties` without saying which property — one of the four gaps
 * measured in `findings/01`. Ours has the frontmatter and the schema in the same
 * function, so there is no reason to have it.
 */

import type { FieldForm, Schema, SchemaType } from "~/modules/home/types.ts";
import { isList, META } from "./documents.ts";
import type { Document, Field, Violation } from "../types.ts";

/** `schema.yaml`'s own words for a form, so a person is told what to type. */
export const formOf = (form: FieldForm): string =>
  form.form === "enum" ? `enum(${form.of.join("|")})` : form.form;

/** What a person sees in `got "…"`. Never a stringified array. */
const gotOf = (value: Field): string => (isList(value) ? "a list" : value);

const fits = (form: FieldForm, value: Field): boolean => {
  switch (form.form) {
    case "text[]":
    case "ref[]":
      return isList(value);
    case "enum":
      return !isList(value) && form.of.includes(value);
    default:
      return !isList(value);
  }
};

/** `type` and `name` first, then the type's own fields, de-duplicated. */
const knownKeys = (declared: SchemaType): readonly string[] => [
  ...new Set([...META, ...declared.fields.map((field) => field.name)]),
];

const against = (declared: SchemaType, document: Document): readonly Violation[] => {
  const at = document.at;
  const frontmatter = document.frontmatter;
  const known = knownKeys(declared);
  const out: Violation[] = [];

  for (const field of declared.fields) {
    const expected = formOf(field.type);
    if (!Object.hasOwn(frontmatter, field.name)) {
      if (!field.optional)
        out.push({ at, detail: { _tag: "MissingKey", key: field.name, expected } });
      continue;
    }
    const value = frontmatter[field.name];
    if (!fits(field.type, value)) {
      out.push({ at, detail: { _tag: "BadValue", key: field.name, expected, got: gotOf(value) } });
    }
  }

  for (const key of Object.keys(frontmatter)) {
    if (!known.includes(key)) out.push({ at, detail: { _tag: "UnknownKey", key, known } });
  }

  return out;
};

/**
 * Every violation in every document, in the order a person would read them:
 * document by document, declared fields before undeclared keys.
 */
export const violationsIn = (schema: Schema, document: Document): readonly Violation[] => {
  const declared = schema.types.find((type) => type.name === document.type);
  return declared === undefined
    ? [
        {
          at: document.at,
          detail: {
            _tag: "UnknownType",
            type: document.type,
            known: schema.types.map((type) => type.name),
          },
        },
      ]
    : against(declared, document);
};
