# Walkthrough — building a slice

**This is the operator's page.** [`slices.md`](rules/slices.md) is the rule; this is what you
actually type, what comes back, and how you tell whether it is going well. It is the
counterpart to [`walkthrough-doctor.md`](walkthrough-doctor.md), which traces one command
through the code.

Worked against **INGEST**, which is the next slice.

---

## The five steps at a glance

```
  vp run slice                    ← where am I, at any moment

  1  map-slice INGEST             →  scope.md            you read it, you correct it
  2  work the frontier            →  Decided grows       one question per session
  3  plan-slice INGEST            →  spec.md + tickets   you approve the ticket graph
  4  per ticket: new-module · tdd · code-review          one ticket per session
  5  close-slice INGEST           →  the roadmap moves
```

**You are in the loop at steps 1, 2 and 3.** Step 4 is the one that runs unattended.

---

## Step 1 — Map

```
/map-slice INGEST
```

**What it does:** traces the code that already exists, reads the ADRs and their amendments,
measures against real data, and writes `docs/planning/ingest/scope.md`.

**What comes back:** one file with five headings, and a report of the frontier.

**How you tell it went well:**

| Good | Bad |
|---|---|
| Every number says how it was measured | numbers with no instrument |
| **Open** questions name modules and call sites, not just mechanisms | only questions about behaviour |
| **Fog** is not empty on a real slice | an empty Fog means it charted past what it can see |
| It decided nothing | a spec appeared |

**The failure to watch for:** a map that reads like a feature list. IMPORT's grill asked good
questions about timezones and dedup and never asked *which modules exist and what calls
what* — which is how a 176-line handler got built without anyone noticing.

## Step 2 — Work the frontier

Each open question carries a **kind**, and the kind decides who does it:

| Kind | You type | You do |
|---|---|---|
| `research` | nothing — it was fired at step 1 | read the findings file when it lands |
| `spike` | `/prototype` | react to the artefact. That is its whole job |
| `grilling` | `/grilling` | **answer.** The agent must not answer for you |
| `task` | nothing | go and do the thing, then say what you found |

**One decision per session, except research.** The answer appends one line to **Decided** and
the question disappears from **Open**.

**How you tell it went well:** Fog shrinks as Open shrinks. If Open empties while Fog is
still full, the map was charted too shallow and step 3's gate will refuse.

## Step 3 — Plan

```
/plan-slice INGEST
```

**It refuses to start unless Open and Fog are both empty.** That refusal is a feature — it is
the difference between deciding something and letting whoever implements it decide silently.

**What comes back:** `spec.md` with a **Program design**, and the build tickets.

**Read the Program design before you approve anything.** It is the part IMPORT never had:

| Part | The question you are checking |
|---|---|
| Production call sites | does the caller read like one verb, or is it growing arms? |
| Call graph | does each step's owner match [`seams.md`](design/seams.md)? |
| Test seams | is each test at the highest useful seam, or reaching inside? |
| Conformance table | does every public symbol have a real caller? |
| Seam delta | are the `seams.md` rows there **before** any module is scaffolded? |

**The one question worth asking out loud:** *"is any module here becoming the composition
root?"* If a handler is much larger than its siblings, the answer is yes.

## Step 4 — Build

One ticket per session, fresh context each time:

```
read the ticket → /new-module if it adds one → /tdd → /code-review → commit
vp check && vp test && vp run shape && pnpm dlx fallow dupes
```

`new-module` **refuses a module with no [`seams.md`](design/seams.md) row.** That is why the
seam delta is step 3's job and why IMPORT needed a ticket 00 it should not have needed.

**How you tell it went well:** each ticket closes green on its own. A ticket that needs the
next one to go green is not a tracer bullet.

## Step 5 — Close

```
/close-slice INGEST
```

Runs [`definition-of-done.md`](design/definition-of-done.md) and **reports before writing**.
A failing row is the answer to *"can we close it"* — not something to fix as part of closing.

Rows 1–6 run. Rows 7–10 are read. **Row 10 is the new one**, and the one that would have
caught IMPORT: does the code's call graph match the design's.

---

## Where am I? — `vp run slice`

```bash
vp run slice
```

Prints, for the active slice: which step it is on, what is blocking, and what to type next.
It reads the same files you do — no state of its own — so it cannot drift from reality.

## What is proven, and what is not

**Honesty about the method itself**, because it has been used on exactly zero slices:

| | Status |
|---|---|
| Build tickets — tracer bullets, blocking edges, one session each | **proven.** Six of them, executed end to end by an agent, all green |
| `close-slice` rows 1–9 | **proven.** Two slices closed on them |
| `slices.md`'s five steps | **unproven.** Written from one slice's failures |
| `map-slice`, `plan-slice` | **unproven.** Never run |
| Program design | **unproven.** No slice has one yet |
| Row 10, the call graph | **unproven**, and read-not-run until two slices have produced the artefact |

**INGEST is the test.** If the map comes back rooted in modules and call graphs rather than
only mechanisms, the method worked. If it comes back looking like IMPORT's grill, it did not,
and the deficit is in `map-slice` rather than in whoever ran it.
