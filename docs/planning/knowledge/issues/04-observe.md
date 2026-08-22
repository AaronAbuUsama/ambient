# 04 — `ambient observe --from <slug>`

**Status:** done · **Blocks:** nothing · **Blocked by:** 00, 01, 02

**The tracer bullet that makes the knowledge base stop being empty.** It cuts
`cli → observe → transcript → knowledge → disk`, and it is demoable on 13,134 real lines.

**Blocked by 02 for a symbol:** `observe.unseen` compares against `base.all()`.

## What to do

1. `new-module observe` — its `seams.md` row exists.
2. `from(lines) → Observation[]`. **Pure. No model, no clock.** Writes only what a script
   cannot be wrong about. Two facts it *may* have, both established by measurement rather
   than assumed:
   - a sticker is identifiable by its header — 512×512 WebP, **207** of 980 blobs;
   - which label is the exporter is identifiable by `grep`, but that fact goes to
     `config.yaml`, **not** into a document — [`design.md`](../design.md) § Alternatives B3.
3. `unseen(found, held) → Observation[]`. **Pure.** Identity is `(type, name)`, **never a
   path** — refusing by filename silently duplicates.
4. `base.write(schema, observations) → WriteReport`. Validates and **refuses**; `Refusal` is
   a value, never a throw. Each accepted write lands as a single atomic publish — `link`,
   not `rename`; see the Comments below.
5. A type does not give you its folder — `Person` → `person/`. Declared, not derived.

## Done when

Gate rows **12, 13, 14, 15, 16, 17, 18** of [`spec.md`](../spec.md) pass.

Row 18 is ADR 007's falsifier 1 and is the only place in this repository where running `ok`
is legitimate — it is a **test** of the format trade, not the product using the tool.

Row 15 is the one that protects the principal's hand edits: correct a page by hand, re-run,
and the file must be byte-identical.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`errors.md`](../../../rules/errors.md) ·
[`knowledge.md`](../../../rules/knowledge.md) — **as amended by**
[ADR 007](../../../adr/007-knowledge-is-files-not-a-client.md) · [`tdd`](../../../../.agents/skills/vendor/tdd/SKILL.md)

## Comments

**2026-08-21 — built. `vp check` pass·pass, `vp test` 162 green (18 files), `vp run shape`
86 files, 11 modules, clean.**

`observe` exists with all six slots (`from`, `unseen`, no third symbol), `knowledge` grew
`base.write`, and `ambient observe --from <slug>` cuts
`cli → observe → transcript → knowledge → disk`. What each gate row is held by:

| Row | Held by |
|---|---|
| 12 | `cli/observe.test.ts` — *"one document per distinct sender label"*, against 5 synthetic Archive lines across 3 labels in a temp home, asserting `fs.readdirSync` on `person/` and the exact bytes of each file. **The "14 on the real Transcript" half is NOT verified** — this agent does not have the principal's real archive and was told not to touch `~/.ambient`. Only the rule is tested |
| 13 | the same test — the exact byte fixture asserted for every file includes `status: unreviewed` and `source: history` |
| 14 | `cli/observe.test.ts` — *"a second run writes 0 and leaves every file's inode unchanged"*, `fs.statSync(...).ino` compared before/after a second `run(["observe", …])` |
| 15 | `cli/observe.test.ts` — *"a hand-edit … survives … byte-identically"*, `fs.writeFileSync` hand-edits `person/rex.md` (new alias, new status, a body), then a second run's `fs.readFileSync` is `toStrictEqual`'d against the bytes written by hand |
| 16 | `knowledge/write.test.ts` — *"a missing required field is a Refusal"*, `base.write` on an Observation missing `aliases`/`numbers`; asserts the two `Refusal`s **and** `fs.existsSync("person")` is `false` |
| 17 | `knowledge/write.test.ts` — *"a type absent from schema.yaml is refused the same way"*, `type: "Meeting"`; asserts the `Refusal` **and** that `knowledge/` still holds only `.ok` and `.okignore` |
| 18 | `knowledge/write.test.ts` — `base.write` a real Observation, then `execFileSync("ok", ["preview"/"lint", …])` against the real `ok` binary (0.55.2, on `PATH` in this environment) and asserts its JSON. Skipped by name, not deleted, if `ok` is absent |
| 1 | `vp check` pass·pass · `vp test` 18 files, 162 tests · `vp run shape` 86 files, 11 modules, clean |

### What was decided, and where a reviewer should look

**1 · There is no `observe.run`, and `design.md:176`/`:290` are stale against
`design.md`'s own § The caller and call graph.** The ticket flagged this tension and asked
for it to be surfaced: § The caller's "mechanical pass" sketch (`:107-138`) and the call
graph's `cli.observe` branch (`:158-164`) both show
`cli.observe` calling `from`, `unseen` and `base.write` in that order and name `cli.observe`
as the thing that "owns the order of the writes"; `:176`'s ownership table and `:290`'s
`observe → transcript, knowledge` line still say `observe` owns it, and `:37` sketches
`observe.run({ lines, base, schema })` as the losing Shape B before the caller was rewritten
caller-first. `observe/types.ts`'s file comment says so explicitly and is the place a
reviewer should look if this is wrong — a three-call wrapper here would only be a second
place that order could drift from the one that actually runs it, and `seams.md:31`'s own
row (`from · unseen`, then one `knowledge.write`) agrees with the caller, not with `:176`.

**2 · `Observation.frontmatter` is `Frontmatter` (`Field`-valued), not
`Record<string, unknown>` as `design.md:202`'s sketch literally writes.** Anti-slop's
`no-unsafe-dictionary-type` rejects an `unknown`-valued dictionary anywhere in `src/`, with
no suppression comment it recognises. Ticket 02's own Comments hit the identical wall for
`Document.frontmatter` and made the identical call — *"the design's sketch writes the
frontmatter as `Readonly<Record<string, unknown>>`, which anti-slop's
`no-unsafe-dictionary-type` rejects... `schema.yaml`'s field forms are closed, so the value
space genuinely is one string or a list of them."* `observe.from` only ever emits strings
and string lists, never truly-`unknown` data, so `Field` says exactly what it produces; the
ontology check (required-ness, enum membership, unknown keys) still runs entirely inside
`base.write`, so ADR 006's boundary is unmoved.

**3 · `Refusal.why` is `knowledge`'s own `ViolationDetail`, not `home`'s `ProblemDetail`.**
`design.md:219`'s comment — *"reuses `failure`'s shape"* — is ambiguous between the two, and
`home.ProblemDetail` has no `UnknownType` arm. Gate row 17 needs one, so `ViolationDetail`
is what `Refusal.why` reuses; `base.write` runs the identical `violationsIn` check `lint`
does, so a `Refusal` and a `Violation` read the same either way.

**4 · `ViolationDetail` grew one arm, `NoFolder`.** Unreachable today — the six shipped
`schema.yaml` types all have a declared folder in `internal/write.ts`'s `folderOf` — but
`schema.yaml`'s own header invites new types (*"Add types freely"*) and `knowledge.write` is
named as every later pass's one path to disk, so a type a user added without a folder entry
refuses cleanly instead of writing into a directory named `undefined`.

**5 · The filename slug keeps unicode and `~` rather than stripping them, on purpose.**
`scope.md` row 27 measured two real labels differing only by a leading `~ ` (`P4` and
`~ P4`); a slug that stripped `~` would collapse both to `p4` and lose one document on real
data. Verified by hand against that exact pair — `~ P4` and `P4` seeded through the real
`src/main.ts` binary land as `person/~-p4.md` and `person/p4.md`, both distinct, both passed
by `ok lint`. Two different names still colliding on their slug is not guarded against (a
`rename` onto an occupied path overwrites) — flagged with a `ponytail:` comment in
`internal/write.ts` rather than built, since no shipped label reaches it.

**6 · `knowledge/write.test.ts` is a second test file, not a 16th `it` in
`knowledge.test.ts`.** That file is 230 lines against a 250 cap; `channel` already splits
this way (`channel.test.ts` plus `lines.test.ts`) rather than adding a legibility exception.
