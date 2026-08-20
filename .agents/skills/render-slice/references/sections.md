# The twelve sections

**The sections are [`slices.md`](../../../../docs/rules/slices.md)'s six steps projected**, grouped
three ways. A section is empty exactly when the step that fills it has not run, so the page's
own completeness is the progress bar. Nothing computes which step a slice is on — you look.

A slice at step 1 fills sections 1, 2 and 11 — mapping produces a destination, a frontier and
measured numbers, and nothing else. A closed slice fills all twelve.

## Group PLAN

| # | Section | Source | What goes in it |
|---|---|---|---|
| 1 | **The slice** | `scope.md` § Destination, § Out of scope · `roadmap.md` | The destination in two lines, the frame (*what it may get wrong / must never get wrong*), a **Where it stands** table, and Out of scope as a list. Never a status dashboard — this is the introduction. |
| 2 | **Frontier** | `scope.md` § Open, § Fog | The question **DAG** (recipe C). Fog as a list underneath. On a closed slice, draw it as it was and say so. |
| 3 | **Tickets** | `issues/*.md` | The blocking **DAG** (recipe D), each ticket with the one fact that sizes it. Status moves here through step 5. |

## Group DESIGN — the rule's own eight parts

**Use the rule's names, never friendlier ones.** [`language.md`](../../../../docs/rules/language.md):
one word, one meaning. *Production call sites* is not "the caller"; *state and failure sequence*
is not "the crash story". Renaming them is how a page stops matching the rule it renders.

| # | Section | `slices.md` part | What goes in it |
|---|---|---|---|
| 4 | **Modules and interfaces** | Interfaces | Recipe A. Each box carries its **whole** public interface. If a module cannot be understood from its box alone, the module is the wrong shape. |
| 5 | **Call graph** | Call graph | Recipe B. The trace from `main.ts` outward, returns and failure branches included. |
| 6 | **Production call sites** | Production call sites | The caller as **syntax-highlighted code**, failure branches included. Read it and section 4's interfaces fall out of it. |
| 7 | **Seams and tests** | Seam delta + Test seams + conformance | The `seams.md` rows this slice adds, then **public symbol → production caller → test seam**. A row with an empty middle column is design that got implemented. |
| 8 | **State and failure** | *conditional* — state and failure sequence | Only when there are durable writes. Per step: what is written, what a crash immediately after leaves, what the next run observes. |

**Alternatives** and **Branch points** are the two remaining parts. Alternatives lives in section 9
(*what each decision beat* is the same statement). Branch points appear in section 2 as the nodes
the grilling questions hang off, and are empty once the frontier clears.

## Group RECORD

| # | Section | Source | What goes in it |
|---|---|---|---|
| 9 | **Decisions** | `docs/adr/` | Every ADR this slice produced or amended, each with **what it beat**. That clause is not optional; a decision with no rejected alternative was not a decision. |
| 10 | **The gate** | `spec.md` § The gate | The numbered assertions, verbatim, in two columns. Definition-of-done row 1 runs this list. |
| 11 | **Evidence** | `scope.md`, `design.md`, spec Further Notes | Every measured number **with the instrument that produced it**. A terminal block for real command output. A claim with no instrument is an assertion. |
| 12 | **Done** | `close-slice` output | The ten definition-of-done rows, pass/fail with evidence. The last state this page will ever hold. |

## Rules that hold across every section

- **No personal data.** Counts, spans and hashes only. Message text, chat subjects, phone numbers
  and display names stay in `.spike-private/`, which is gitignored.
- **Every number names its instrument**, inline, in the muted `.src` line.
- **The eyebrow is `Ambient · <step or group>`** and nothing else.
- **Empty sections say which skill fills them** and what will be in them. An empty section is
  information, not an apology.
