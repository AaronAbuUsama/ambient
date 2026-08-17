# METHOD — session handoff

**Written 2026-08-17 before compaction.** The single source of truth for where this work
stands. Both compaction prompts point here rather than restating it.

Branch `main`, tip **`f0516c5`**, working tree clean.

---

## The mission

**METHOD is a slice, and it is not product.** It turns how a slice gets built from folklore
into skills, because IMPORT shipped green while its topology was wrong and nothing noticed.

The rule is [`docs/rules/slices.md`](../../rules/slices.md). The evidence for why it was
needed is [`deficits.md`](deficits.md). The operator's page is
[`docs/walkthroughs/slice.md`](../../walkthroughs/slice.md).

---

## The crux — the insight that cracked it

**We codified the artefacts and not the method.** Eleven rules say what a *file* must look
like and `vp run shape` enforces every one. Nothing said how a decision becomes a file, so
when the method mattered it fell back to generic skills that do not know this repository.

Measured, and this is the whole argument:

```
SKELETON   seams.md 11:32  →  ADR 001/002 + spec 15:22    design 4h BEFORE the spec
IMPORT     spec 11:48 → code 12:19 → ADR 004 16:37        interface 5h AFTER the code
```

`slices.md` as first written encoded **IMPORT's** order, not SKELETON's — a rule taken from
the slice that went wrong. **That is the open defect** (see *Held / next*).

---

## Decisions, with their reasons

| Decision | Why |
|---|---|
| **INTAKE split into IMPORT + INGEST** | the halves share only an output type; one needs a file, the other a credential and an open question. **Order is forced** — a full sync is one-shot per credential, so the write path must exist before the next pairing |
| **`Area` → `Slice`** throughout | and the rejected ordering renamed **breadth-first**, or "thin vertical slice" would read as the thing we adopted |
| **`CONTEXT.md` is the lexicon**, `product.md` is not | product.md says *"nothing here is about libraries, services, or code"*, and half the words needed are code words. Written because *"backfill"* named two operations and produced four wrong answers |
| **Four kinds from wayfinder** — `research · spike · grilling · task` + HITL/AFK | the only thing that genuinely varies. Its map-as-issue and Decisions-so-far index rejected: a second copy of every decision, which `decisions.md` forbids |
| **No pre-spec tickets** | IMPORT's whole pre-spec phase fit one session. Build tickets stay — proven across six |
| **Nine skills vendored, traced not swept** | first pass copied all 35, which was the lazy answer. `modules.md` requires `codebase-design`'s vocabulary *exactly*, so a rule must not depend on words that can change with no diff here |
| **`impeccable` vendored then dropped** | the only page this project generates is a slice, and `render-slice` owns it. **`dataviz` cannot be vendored** — ships with the harness. Both recorded in `vendor/README.md` |
| **`scripts/slice.ts` deleted** | 117 lines regex-parsing markdown to say which step a slice was on. An agent reads the file. Justified with *"a rule that cannot be run is not a rule"* — but that is about **rules**, not questions |
| **DoD row 10, read not run** | the call graph. IMPORT passed rows 1–9 while `cli` was the composition owner |
| **`import` is a module** | the earlier "no orchestrator module" call ran the deletion test against a **guess** (4 lines) rather than code (~100). Recorded in `import/types.ts` |

---

## Done — this session, oldest first

```
a5c5d9f  adr: history import reads an archive — and two amendments the same day
a1f1bf5  lang: one word, one meaning — the lexicon is CONTEXT.md
7c38d1c  tooling: three checks that were lying, and the reasons they were
3e9b910  import: INTAKE splits, and the archive half is specified into six tickets
d29085e…5b553e2   IMPORT built by Codex — six tickets, one commit each
5a7bddf  import: the event count was four numbers from four instruments
2aec676  method: what the build process is missing, and the evidence
874fa28  method: how a slice is built, as a rule — and Area becomes Slice
33ebae2  method: vendor every skill, write map-slice and plan-slice, add row 10
f9c533d  method: prune the vendor to seven, and write the operator's page
0287726  method: fix the type error vp check caught in scripts/slice.ts
2ae160f  method: fix all four open defects, and rebrand the setup skill
ab45a95  docs: six directories, one map, nothing loose at the root
e1a7ce4  method: vendor the design skills, and answer their setup gate here
eafecc0  method: one page per slice, and a skill that composes rather than forks
68d2180  method: delete scripts/slice.ts — a skill reads markdown, not a parser
f0516c5  method: render-slice is a living document, not a closing report
```

**IMPORT is closed and proven on real data**, not just tests: the real 306 MB ZIP →
**13,134 Transcript lines, 980 content-verified Blobs, 5.6 s**, idempotent re-run, `doctor`
exit 0. `~/.ambient` holds it; the previous contents are at
`~/.ambient.backup-before-import-2026-08-17`.

**Repo state:** `vp check` pass·pass · `vp test` 53 passed · `shape` 44 files, 6 modules,
clean · `fallow` 0 lines · roadmap 199/200.

---

## Held / next — in order

### 1 · `design-slice` — the missing step. **This is the main task.**

`slices.md` currently runs **Map → Frontier(grill) → Plan**, so the Program design sits inside
the spec at step 3, *after* all the grilling. That is backwards, and it is why INGEST's
`scope.md` asks five `grilling` questions with **zero code blocks** — violating the standing
instruction never to ask in the abstract.

**Restructure to:** `Map → DESIGN → Frontier → Plan → Build → Close`.

`design-slice` produces, **before anything is grilled**:

1. **The call graph, written as the caller, before the callees exist.** Real call expressions
   with what each returns and how it fails. Reading it back yields the interfaces, the seam
   delta, the test seams and the conformance table as by-products. Worked example in
   [`docs/walkthroughs/import.md`](../../walkthroughs/import.md).
2. **Two diagrams**, via the vendored `diagram-design` — a **sequence diagram** for the call
   stack (order, returns, failure branches, loops) and a **module/interface diagram** (boxes
   carrying their whole public interface). Prototypes were drawn this session and shown to
   the principal; they landed. They are **not in the repo** — redraw them inside the document.
3. **Design-it-twice** where `seams.md`'s two-clause bar is met → an ADR.
4. **An ordered question DAG**: AFK roots (`research`, `spike`) first and **dispatchable
   immediately as background subagents**; `task` next; **every `grilling` downstream of the
   design**. Not everything is downstream — say plainly what must come first.

**It was brainstorming, not interrogation.** SKELETON put two shapes up, tried them against a
caller, and the caller killed one. Encode that, not an interview.

### 2 · Rebuild `render-slice` as a living multi-section document

Corrected at the very end of the session and only partly reflected in the skill. What the
principal actually wants:

> **A multi-page HTML document per slice that we work on together** — ADRs, decisions, the
> plan, the diagrams, the important stuff, all in it. Regenerated **as we go**, not composed
> at the end. Diagrams **inline**. One document, never a directory of files.

Separate `.svg` files become worth having when this repo has a remote and diagrams ride in
PRs. **It has no remote.** Do not scatter SVGs now.

### 3 · INGEST — `design-slice`'s first real run

Its `scope.md` exists **only in the worktree** at
`.claude/worktrees/slice-process-next-steps-626703/docs/planning/ingest/`, with three research
findings. Its one genuinely open question: **how a one-shot full sync survives a crash between
seven ~4,800-message batches**, on a callback that must not block.

### 4 · Smaller, still open

- **METHOD has no `scope.md`** — it never went through its own process.
- **Template repo** — deliberately deferred until the method has run once for real.

---

## Gotchas

- **Never run destructive git commands in `~/projects/whatsappd`.** Another agent works there.
  Read freely; use a worktree to write.
- **A full WhatsApp sync is one-shot per credential.** Do not spend a pairing on a tool that
  does not durably write.
- **`.spike-private/` is gitignored personal data.** Read it for evidence; commit nothing from
  it. Fixtures are small and synthetic.
- **Never edit `.agents/skills/vendor/`.** Two declared exceptions only, both in its README:
  the `code-review` repoint, and `diagram-design`'s style guide *if* Ambient ever gets a
  palette. Its branding gate is already answered in `setup-abu-usama-skills` — **do not ask
  it again.**
- **No remote.** Never `gh`, never `glab`.
- **`vp check`, `vp test`, `vp run shape`, `pnpm dlx fallow dupes`** — run all four; `shape`
  skips `vendor/` and `worktrees/` deliberately.
- **A plain `.replace()` that misses reports nothing.** Two edits this session silently did
  nothing and were reported as done. Verify every scripted edit prints a hit.
- **State the instrument with every number.** The same question about one Archive gave 177,
  172, 105 and 51 depending on the regex; only the last used the mark the source carries.

## The standing lesson

Four wrong answers on the history question in one session, each from reading one layer and
stopping — and the answer was in the repository every time. **Three times the principal said a
measurement contradicted what he knew about his own account, and three times he was right.
When that happens, doubt the measurement.**

## Key pointers

| What | Where |
|---|---|
| The contract | [`AGENTS.md`](../../../AGENTS.md) |
| The lexicon | [`CONTEXT.md`](../../../CONTEXT.md) |
| How a slice is built | [`docs/rules/slices.md`](../../rules/slices.md) |
| The operator's page | [`docs/walkthroughs/slice.md`](../../walkthroughs/slice.md) |
| Why METHOD exists | [`deficits.md`](deficits.md) |
| Doc map | [`docs/README.md`](../../README.md) |
| Where we are | [`docs/design/roadmap.md`](../../design/roadmap.md) |
| Call-graph worked example | [`docs/walkthroughs/import.md`](../../walkthroughs/import.md) |
