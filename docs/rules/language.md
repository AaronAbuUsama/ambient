# One word, one meaning

## The rule

The lexicon is [`CONTEXT.md`](../../CONTEXT.md), at the repository root. It **defines**
words and **decides** nothing.

1. **Use the word that is already there.** Before naming a thing, check the lexicon. If
   the thing has a word, use that word — including in code identifiers, commit messages
   and comments.
2. **A new noun is added in the same change that introduces it.** If a session invents a
   noun the lexicon does not hold, the change that introduces it adds the entry. Not
   later.
3. **A definition never carries a decision.** An entry says what a thing *is*, in one or
   two sentences, plus the words to avoid. Anything about ownership, mechanism, schema or
   order goes in the document that owns it, and the entry links there.
4. **The code words are not redefined.** *Module, interface, implementation, depth, seam,
   adapter, leverage, locality* belong to the `codebase-design` skill and to
   [modules.md](./modules.md). The lexicon holds domain words only.

Where each kind of statement lives:

| Statement | Home |
|---|---|
| what a word means | [`CONTEXT.md`](../../CONTEXT.md) |
| what a noun owns, and what is settled or open about it | [product.md](../design/product.md) |
| which modules exist and which way they depend | [seams.md](../design/seams.md) |
| a rule, its argument, and its check | this directory |
| a decision, and its amendments | [`docs/adr/`](../adr/), per [decisions.md](./decisions.md) |
| a path, a schema, a config key, a CLI verb | the area's spec under [`docs/planning/`](../planning/) |

## Why

**One word naming two operations produced four wrong answers in a single session.**
"Backfill" meant *History Import* and *Continuous Ingestion* at the same time, and the two
read different sources with different failure modes. [product.md](../design/product.md)
had already written the warning —

> Two distinct operations, both real — don't collapse them, and don't call everything
> "backfill"

— and the warning was not enough, because a warning inside a design document is only read
by somebody already reading that document. The words are needed by every session, including
the ones that never open `product.md`.

**A lexicon is cheap and a synonym is not.** Two words for one thing costs a reader one
lookup. It costs an agent a wrong conclusion, because the agent has no way to know the two
words are the same thing and will reason about them as two.

**Definitions and decisions rot at different rates.** *Archive* has meant the same thing
since the day it was named; *how an Archive is read* changed with
[ADR 003](../adr/003-history-import-is-an-archive.md). Keeping them in one file means every
decision edits the glossary and every glossary edit looks like a decision. Keeping them
apart is what lets the lexicon be short enough to read in full.

**Why a separate file rather than `product.md`.** They are different artefacts and the
first line of `product.md` says so: *"Nothing here is about libraries, services, or
code."* Half the words a session needs — Reader, Write path, Transcript, Marker, Wall
clock — are file-format and code words, so they cannot go there without breaking that
sentence. `product.md` also carries Settled, Open and Amended sections, which a glossary
must not have. The two were merged in an earlier draft of this rule and the merge failed
on exactly that: the entries that fit `product.md` were the ones that needed no
definition.

## The check

`vp run shape` — every cross-link in every document resolves, so an entry cannot point at
a document that has been moved or renamed.

That a newly-invented noun was added to the lexicon is **not currently checked**. The
observable state is a review one: a diff that introduces a domain noun and does not touch
`CONTEXT.md` is the thing to question.
