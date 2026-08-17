# A schema nothing reads

*On why knowledge graphs built by language models drift, what forty years of knowledge
representation can and cannot do about it, and the one mechanism that decides everything.*

Date: 2026-08-17. The measurements are from `~/email-pa`, a working assistant that has
been running against three real businesses. Companion to
[ontology-design-space.md](ontology-design-space.md), which carries the detail; this is
the argument.

---

## The file that felt like design

There is a particular satisfaction in writing a schema. You open a blank YAML file and you
name the world: `Organization`, `Person`, `Document`, `Thread`, `Deal`, `Commitment`. You
give each one its properties. You add a comment explaining that `status` may be
`unreviewed`, `open`, `paid`, `disputed` or `superseded`, and nothing else. You write a
line at the top that says the vocabulary is closed — the model picks from it and may not
invent.

It takes an afternoon and it feels like the most important afternoon of the project,
because you have just decided what your system is able to think about.

Then you run it for a few months and count what actually happened.

`Document` declared thirteen properties and carried sixty-three. `Organization` declared
four and carried thirty. The most numerous type in the entire graph — 1,353 entities, 72%
of everything — was `Price`, which does not appear in the schema at all. Three of the seven
declared types were never instantiated once: `Thread`, `Deal`, and `Commitment`, the last
of which is arguably the whole point of a personal assistant.

And the type that did *not* drift, `Person`, still drifted by one character: the schema
said `notes` and the model wrote `note`, six times, and nothing noticed.

Nothing noticed because nothing was looking. No script in the entire system reads
`schema.yaml`. The closed vocabulary lived in a prompt and in the intention of the person
who wrote the file, and neither of those is a mechanism.

## The natural experiment

That story has an obvious moral — *validate your schema* — and the obvious moral is
correct but shallow. The deeper finding was hiding in a different measurement.

The same system asks the model to mark uncertainty in its prose. Two conventions, declared
in the same file, in the same paragraph, addressed to the same model, in the same run:

> `[assumed]` — inference, not evidence
> `[conflict: see log 2026-08-14]` — new evidence contradicts the page; keep **both**
> claims, log it, never silently overwrite

Across ninety-three pages of accumulated prose, `[assumed]` appears twenty-nine times.
`[conflict]` appears zero times.

The difference between them is not emphasis, or wording, or position in the prompt. It is
that a small Python script counts `[assumed]` and prints the total on the dashboard the
human opens every morning, under a heading that says *"things a person could settle in a
sentence."* Nothing counts `[conflict]`. Nothing ever surfaced it, nothing ever asked for
it, and so — despite being declared with equal weight to a model perfectly capable of
following the instruction — it never happened at all.

Once you see it there, you see it everywhere in the data. `Document` reached 494 entities
because a script created an empty one for every email attachment. `Price` reached 1,353
because a script created them from price lists. `Person` reached five, and `Commitment`,
`Thread` and `Deal` reached zero, because nothing created them and nothing asked for them;
they existed only as an invitation the model was free to decline, and it declined roughly
1,880 times in a row.

The system also had a `retract` verb for correcting mistakes. It fired three times in 1,883
operations. Not because no mistakes were made.

So:

> **Whatever the deterministic layer does not create or count, does not happen.**

This is not a claim about model obedience. The model was obedient. It is a claim about
what obedience can and cannot accomplish: an instruction with no forcing function produces
compliance only when the model happens to be looking in the right direction, and over
thousands of operations "happens to" converges on zero.

## The drift was a feature request

Now go back to the sixty-three properties and read them instead of counting them.

```
confidence · needs_review · review_flagged · review_reason · reviewed_full
resolution · resolved · document_quality_question · sensitive
contact_conflict · contact_attribution_question · status_note
source · phone_profile_source
```

Thirteen invented properties across three types, and they are not noise. Every one of them
is asking a version of the same four questions: *how sure am I, who should look at this,
what does this contradict, and where did I get it.*

The schema offered one `status` enum and no answer to any of the four. So the model built
its own, at runtime, in the property namespace, one field at a time, inconsistently, with
no two documents agreeing on the spelling.

The sharpest case is `confidence`. The system's conventions declare `confidence:
high|medium|low` — for *pages*. The model pushed it down into the *graph*, onto individual
facts, where it had never been declared. It wanted to say "I am sure about this phone
number and unsure about that role" and it only had a way to say "I am moderately sure about
this person."

That is a specification, written in the only language available to something that cannot
edit its own schema. A validator that merely rejected the unknown fields would have deleted
that specification thirteen times and learned nothing from it. Which suggests validation
needs at least two severities: an illegal *shape* is an error, and an unfamiliar *field* is
a message.

## Two things called reasoning

This is where the formal tradition arrives, and where it needs to be handled carefully,
because the word "reasoning" is doing two incompatible jobs.

The first job is **interpretation**: turning `yeah I'll get it to you Friday` into a
structured commitment with an owner and a date. The second is **entailment**: given a
commitment with a due date and an open status, and given today's date, concluding that it
is overdue.

RDFS, OWL, description logics, the whole apparatus of automated reasoning — all of it
addresses the second job exclusively. An OWL reasoner cannot read a message. It operates on
assertions that already exist and computes what follows from them under a formal semantics.

For thirty years this was the right place to put the effort, because the first job was
impossible and the second was therefore the only one available. A language model inverts
that completely. Interpretation, the historically impossible half, is now the cheap and
abundant half. Entailment, the half that consumed the field, has shrunk to about five rules
that any competent programmer writes in an afternoon: same key means same entity, a subtype
is visible to supertype queries, past due and still open means overdue, and count things.

There is a further wrinkle that makes the formal machinery not merely unnecessary but
actively wrong-shaped for this. RDFS's `domain` and `range` are the constructs everyone
reaches for when they want to say "an `employer` property belongs on a Person." They do not
mean that. Under RDFS semantics they are inference rules, not constraints: assert that a
company has an employer and RDFS does not object, it *concludes that the company is a
person*. Under those semantics a schema cannot be violated at all — only elaborated. A
system whose central promise is that a validator rejects malformed input cannot take its
meaning from a formalism in which rejection is not an available outcome.

The tradition noticed this eventually. SHACL, standardised in 2017, exists precisely
because OWL could not validate, and its central construct — `sh:closed`, meaning *no
properties beyond those declared* — is the exact guard whose absence produced sixty-three
properties where thirteen were declared. Anyone hand-rolling a YAML schema plus a checker
is writing a small SHACL, and should know it, because it means the design is in a
known-good tradition rather than being improvised.

## What the old machinery is actually for

None of which means the formal work was wasted. It means its value has moved from runtime
to design time.

OWL's vocabulary of property characteristics — functional, inverse-functional, transitive,
symmetric, with declared domain and range — is best read now not as machinery to execute
but as **a questionnaire you are obliged to answer for every field you define**:

- Can this hold more than one value?
- Does sharing this value mean two records are the same thing?
- Does it chain?
- What can carry it, and what can it point at?

Most schema bugs are fields whose semantics were never decided, and this questionnaire
finds them for free. Answer it honestly about a field called `org: ref?` on a Person and
you discover within one sentence that it is functional, that it therefore holds only the
current employer, and that you are silently destroying employment history on every update
— in a system whose entire value proposition is that it accumulates.

You get that finding from the questionnaire. You do not need a reasoner to hand it to you,
and if you had one it would not have mentioned it.

Two OWL constructs survive as more than questions. `InverseFunctionalProperty` — the
identity key — earns its place because it converts a judgement call into a computation: a
declared key means a script can merge two records without being wrong, which sharpens
rather than blurs the line between what the machine may decide and what the model must.
And `differentFrom` earns its place for a reason that only becomes obvious once a system
has run for a while: when a human rules that two similar records are genuinely different
people, that ruling has to be *stored*, or the next pass proposes the same merge, and the
one after that, forever. A system that can propose but cannot remember a rejection is a
system that will annoy its user into ignoring it.

## The queue is the ontology

Which brings the argument back to where the measurements pointed.

The schema is not where a knowledge base is decided. It is a contract at one seam — what
the model is permitted to assert — and it is worth enforcing for the same reason any type
system is worth having. But the thing that determines what a system actually knows is
upstream of the schema entirely: it is whether some deterministic process creates an empty
record and puts it in front of the model with a status that means *this is unfinished*.

Every type that had a stub-creator flourished. Every type that did not measured zero, no
matter how central it was to the stated purpose of the software. The conventions that were
counted were followed; the conventions that were merely declared were not. The correction
verb that nothing prompted was never used.

So the useful test for a proposed type is not "is this an important concept in the domain."
It is: **what mechanical process creates one of these in an unfinished state, and what
surface makes its unfinishedness visible?** A type that cannot answer both is a wish, and
it will measure zero, and it will do so quietly while the schema file continues to imply
otherwise.

That is the whole finding. The ontology is not the knowledge, and it is not the reasoning.
It is the shape of the questions the machine is obliged to keep asking.
