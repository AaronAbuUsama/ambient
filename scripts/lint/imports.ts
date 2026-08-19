/**
 * How a module names another module — [imports.md](../../docs/rules/imports.md).
 *
 * Both rules read the *import specifier* rather than the line it sits on, so a
 * doc comment linking to `../../../docs/adr/…` and a template literal reading
 * `${import.meta.dirname}/../..` are prose and a path, not imports — which is
 * what the regex here before could only approximate by demanding a `from "` in
 * front of the match.
 */

import { defineRule } from "@oxlint/plugins";

import type { ESTree, Visitor } from "@oxlint/plugins";

/** The module a file belongs to, or `undefined` for a file outside `src/modules/`. */
const owner = (filename: string): string | undefined =>
  /\/src\/modules\/([^/]+)\//.exec(filename)?.[1];

/**
 * Every place a file names a module: static and dynamic import, re-export, and
 * `import("…")` in type position. Declared once, because two rules ask the same
 * question of the same nodes.
 */
const overImportPaths = (look: (node: ESTree.Node, path: string) => void): Visitor => ({
  ImportDeclaration: (node) => {
    look(node.source, node.source.value);
  },
  ExportAllDeclaration: (node) => {
    look(node.source, node.source.value);
  },
  ExportNamedDeclaration: (node) => {
    if (node.source !== null) look(node.source, node.source.value);
  },
  TSImportType: (node) => {
    look(node.source, node.source.value);
  },
  ImportExpression: (node) => {
    const source = node.source;
    if (source.type === "Literal") look(source, String(source.value));
  },
});

/** A relative path encodes distance, and distance changes: name the module instead. */
export const noRelativeEscapeRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow an import path that climbs out of its module with `../..`; a module names another module by what it is.",
    },
    messages: {
      relativeEscape: "relative import out of the module — name it `~/modules/<name>/…` instead",
    },
  },
  createOnce(context) {
    return overImportPaths((node, path) => {
      if (!path.includes("../..")) return;
      context.report({ node, messageId: "relativeEscape" });
    });
  },
});

/** `internal/` is what only the owning module knows, and an import is the only thing that can break it. */
export const noForeignInternalRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing another module's `internal/`; `types.ts` and `service.ts` are what callers may know.",
    },
    messages: {
      foreignInternal: "imports `{{module}}`'s internal/ — internal is what only that module knows",
    },
  },
  createOnce(context) {
    return overImportPaths((node, path) => {
      const named = /^~\/modules\/([^/]+)\/internal(\/|$)/.exec(path)?.[1];
      if (named === undefined || named === owner(context.filename)) return;
      context.report({ node, messageId: "foreignInternal", data: { module: named } });
    });
  },
});
