# The step report

**What a step hands back when it ends.** Every step of
[`slices.md`](../rules/slices.md) ends with one, and
[`.agents/skills/slice/SKILL.md`](../../.agents/skills/slice/SKILL.md) is the **only** thing
that emits it. One emitter, not six: six skills emitting their own format is how it was
improvised every time, and improvising it is what produced four of the deficits this
template answers.

It is also **where a decision made during build is recorded.** A build session that decides
something — a shape the ticket did not settle, a correction to the design — writes it under
*What this step decided*. That is the one home for it; before this file there was none, and
such decisions were lost in whichever transcript happened to hold them.

It is a cap on length as much as a shape. Nothing in it may restate what the page holds
better.

**The two rules that generate the rest:**

1. **Write for someone who has read nothing.** Not the rule, not the scope, not the design.
   Every id is expanded the first time it appears; every question is a sentence ending in a
   question mark; no `§`, no filename standing in for a thought.
2. **Do not re-render the page.** Say what *changed* and point at the page for the rest. The
   page is the process; a prose copy of it is a worse copy.

````markdown
```
<SLICE>   ①Map ✔  ②Design ✔ ← just ran  ③Frontier ← next  ④Plan  ⑤Build  ⑥Close
```
↑ **Delete this line.** ASCII rules are hard to read; use the table. It is here only to say
  it was tried and rejected.

# Where we are

<SLICE> is one slice on the roadmap. Every slice goes through the same six steps.

| Step | State | What it produces |
|---|---|---|
| **1 · Map** | ✅ done | ... |
| **2 · Design** | ✅ **just finished** | ... |
| **3 · Work the frontier** | ⬅ **next** | ... |
| 4 · Plan | — | ... |
| 5 · Build | — | ... |
| 6 · Close | — | ... |

<one line: the page has all of it, and which section is the one to react to>

# What <SLICE> is, in two lines

<no jargon, no ids. What a person would say out loud. Include one measured number
 so it is concrete.>

# What this step decided

<the shapes that went up, which one the caller killed, and WHY — the mechanism,
 not the aesthetics. Two short paragraphs, then a table if the trade is real.>

# The open questions

Every question gets a short id so the documents can point at it. That is all the
letters mean:

| | Kind | Who answers it |
|---|---|---|
| **R** | research | a background agent, reading source code |
| **S** | spike | throwaway code, run to find out |
| **T** | task | a human goes and looks something up |
| **G** | grilling | **you.** Only you can decide it |

## ✅ Answered
**<id> — <the question, as a question>**
<the answer, in plain words, with its instrument>

## 🟢 Open — nobody is waiting on you
**<id> — <the question, as a question>**
*Why it matters:* <one line>  ·  *Blocked by:* <or "nothing — I can run this now">

## 🔴 Open — these are yours
**<id> — <the question, as a question>**
<enough context to answer it without opening a file. Candidates, if there are candidates.>

# Housekeeping

<checks, commits, and anything you would like permission for. Three lines maximum.>
````

**What the template forbids**, each because it happened:

| Never | Because |
|---|---|
| A bare id in a heading or a lead sentence | deficit 22 |
| A question written as a fragment — *"one Chat, or the seed"* | it is a filename, not a question |
| A `§` reference standing alone | it points into a document the reader has not opened |
| Re-narrating the page's **Where it stands** in prose | deficit 7 — the page does it better |
| Reporting an answer without its question | deficit 9 |
| Reporting what is open without what just closed | deficit 8 |
| An ASCII box-drawing header | tried twice, unreadable both times |
