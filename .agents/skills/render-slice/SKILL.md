---
name: render-slice
description: Render one slice as a single self-contained HTML page — its destination, the open-question DAG, the ticket graph, the module and interface diagram, the call graph, the production call sites, the seam delta and conformance table, the decisions, the gate, the evidence and the definition-of-done rows, in one document. Use when the user asks to see a slice, to render or share a slice, wants the plan as a page, or says "show me INGEST".
---

# Render a slice

**One slice, one document — and it is where the work happens, not a report at the end.**

Twelve sections, grouped **Plan · Design · Record**, regenerated as the slice progresses so at
any moment the page is the whole current state in one place. **Every step of
[`slices.md`](../../../docs/rules/slices.md) ends by calling this**, and each step's own skill
names it in its *Finish*.

Output: `docs/planning/<slice>/<slice>.html`. **Gitignored and regenerated**, never hand-edited —
the markdown and the ADRs stay the source of truth, and the page never becomes a second place to
keep things true.

## Read these two first

- [`references/sections.md`](references/sections.md) — the twelve sections, what fills each, and
  which `slices.md` part it renders. **Use the rule's names, never friendlier ones.**
- [`references/diagrams.md`](references/diagrams.md) — the four diagram recipes, with solved
  coordinates. **Do not invent geometry.**

## Assemble, do not author the chrome

The page is `assets/shell.html` with six placeholders spliced in:

| Placeholder | You supply |
|---|---|
| `/*FONTS*/` | `assets/fonts.css` — 88 KB of base64 woff2. **Never read this file.** Splice it by path. |
| `<!--SLICE-->` | the slice's name, twice — the `<title>` and the rail heading |
| `<!--STATUS-->` | the rail foot, one line: the step reached, e.g. `MAPPED · 1/6` |
| `<!--BODY-->` | the `<section>` blocks you author, one per section that has content |
| `<!--DATA-->` | `<script type="text/plain" id="pN" data-mode="…">` blocks holding raw code and terminal output |
| `/*NAV*/` | the nav array: `[["Plan",[["The slice",0],…]],["Design",[…]],["Record",[…]]]` |

**`data-mode` picks the transform**, and `pN` fills `cN` in the body. There is no fixed number
of blocks and no required one: a block with no `cN`, or a `cN` with no block, is skipped.

| `data-mode` | Does |
|---|---|
| `js` (the default) | the tokenizer in the shell — keywords, strings, types, calls |
| `tree` | a call graph: everything after two or more spaces is dimmed to the gloss colour |
| `raw` | verbatim `textContent`. Terminal output. **Do not escape `<` and `>` in this one** |

Write the body and data to scratch files, then splice in one command:

```bash
node -e 'const f=require("fs"),S=".agents/skills/render-slice/assets/";
let h=f.readFileSync(S+"shell.html","utf8")
 .replace("/*FONTS*/",f.readFileSync(S+"fonts.css","utf8"))
 .replaceAll("<!--SLICE-->",process.argv[5])
 .replace("<!--STATUS-->",process.argv[6])
 .replace("<!--BODY-->",f.readFileSync(process.argv[1],"utf8"))
 .replace("<!--DATA-->",f.readFileSync(process.argv[2],"utf8"))
 .replace("/*NAV*/",f.readFileSync(process.argv[3],"utf8"));
f.writeFileSync(process.argv[4],h);
console.log("wrote",Math.round(h.length/1024),"KB");' body.html data.html nav.json \
  docs/planning/<slice>/<slice>.html INGEST "MAPPED · 1/6"
```

**This is a splice, not a parser.** A script that reads markdown to decide what a slice *is*
was written once and deleted; an agent reads those files directly. Concatenating three strings
is not that.

Code in `<!--DATA-->` is highlighted at load by the tokenizer already in the shell — write it
raw, escaping only `<` and `>` as entities. The exception is `data-mode="raw"`, which is set as
`textContent` and so must carry its angle brackets literally.

**Empty sections are the normal case before step 6.** Render every section that has content, and
render the rest as one line naming the skill that fills it — the page's completeness *is* the
progress bar, and it can only be read if the empty ones are on it. Nothing in the shell requires
a given `pN` to exist; that was a defect, found by rendering a slice at step 1.

## What must not drift

Inherited from [`artefacts.md`](../../../docs/rules/artefacts.md) and not restated there:

- **Self-contained.** Inline CSS, inline SVG, base64 fonts. No CDN, no external request, no
  JavaScript needed to read it. The only `http://` in the file is the SVG namespace.
- **A local file. Never an Artifact.** A slice carries measurements taken from the principal's
  real account.
- **No personal data.** Counts, spans and hashes only.
- **One page per slice, and no others.** If you are about to write a second HTML file for a
  slice, you are writing a section of this one. Diagrams go **inline**; do not scatter `.svg`
  files beside it. (Separate SVGs earn their place when this repo has a remote and diagrams ride
  in pull requests. It has none.)
- **Desktop first.** The reading scene is at the keyboard, terminal alongside. The rail collapses
  with `[`; sections move with `←` `→` and `1`–`9`.

## Finish

1. Splice, and report the byte size.
2. Check self-containment: the only `http` in the file is the SVG namespace, four times.
   `grep -o 'https\?://[^" )]*' <path> | sort | uniq -c`
3. **Open the page and look at every diagram.** Not the DOM, not a regex over the file — the
   rendered page. Numeric self-checks have passed on a diagram whose legend ran straight through
   a row of nodes; looking at it caught that in one second.
4. Report which sections rendered, which are empty and which step fills them, and then the one
   thing the page says: **what is startable right now.**

**The design of this template was done with `impeccable`, which is not vendored** and is not a
dependency of this repo — it shaped `assets/shell.html` once. What is vendored is
[`diagram-design`](../vendor/diagram-design/SKILL.md) and the template itself. Do not reach for
`impeccable` to render a slice; the layout is already decided, and the geometry is in
[`references/diagrams.md`](references/diagrams.md).
