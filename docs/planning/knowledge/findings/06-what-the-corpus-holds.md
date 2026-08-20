# KNOWLEDGE · T1 — What 18 months of real conversation actually holds

**Question.** Do the six types Ambient ships fit the material, and what is missing? Nobody
had read the corpus. Everything asserted about it came from `grep`, which can say that
commitment-shaped language is frequent but cannot say what a reasoning pass would extract.

**Sources.** `~/.ambient/chats/capxul-devs/transcript.jsonl`, `~/.ambient/blobs/` and
`~/.ambient/schema.yaml`, all read and never written. No `ok` command was run anywhere. The
line shape is [`src/modules/transcript/types.ts`](../../../../src/modules/transcript/types.ts);
the field-form grammar is [`src/modules/home/internal/schema.ts:24`](../../../../src/modules/home/internal/schema.ts).

**Anonymisation.** People are `P1`…`P12` on the same ranking
[`scope.md`](../scope.md) uses, so the two documents refer to the same humans. Organisations
are labelled by function — `Org A` for the principal's company, `Org B`/`Org C` for its
products, `Cust n`, `Partner n`, `Comp n`, and third-party services by what they do rather
than what they are called. `GitHub` is named because `scope.md` already names it as a Source
and the `Issue` verdict turns on it. Nothing is quoted; every excerpt below is paraphrase.
Raw extracts are in `.spike-private/knowledge/` (gitignored) and never left the machine.

**[read]** = asserted by a cited line. **[measured]** = computed here, instrument named.
**[inference]** = mine, asserted by no source.

---

## How I sampled — stated before any count

Seven contiguous windows, chosen to spread across the 18 months and to hit both the densest
months and the thinnest, read as conversation rather than as rows.

| Window | Lines | Period | Why this one |
|---|---|---|---|
| W1 | 1–300 | Feb 2025 | the group's first ten days — roles assigned, first commitments |
| W2 | 2210–2509 | May 2025 | mid-early; a long debugging arc |
| W3 | 4131–4430 | Aug 2025 | the densest month in the corpus (1,376 lines); mainnet launch |
| W4 | 6998–7297 | Nov 2025 | first paying customers; a money bug |
| W5 | 9406–9705 | Mar 2026 | second-densest month (1,217 lines); grants, partners, a rewrite |
| W6 | 12460–12759 | Jul 2026 | the modern working style — agents, trackers, an SDK |
| W7 | 13013–13134 | Aug 2026 | the tail, to the last line on disk |

**1,922 lines — 1,912 messages and 10 events — of 13,134. 14.63% of the corpus.**
*Instrument: a Node script over the JSONL selecting those index ranges; counts in
`.spike-private/knowledge/measure.mjs`.* **[measured]**

Every count below says which of three instruments produced it: **read** (I classified the
lines by hand and say how many), **grep** (a regex over message text — a presence probe that
over-counts and never under-counts), or **blob** (`file -b --mime-type` and `sips` over
`~/.ambient/blobs/`). Where a count is corpus-wide rather than sample-wide it says so.

Monthly distribution, for context on whether the windows are representative
*(instrument: `jq .wall | sed | uniq -c`)* **[measured]** — the corpus runs 122–1,376 lines a
month, and the sample takes a 300-line slice from the top of seven of those months. It is
therefore biased toward the **start** of a month and toward **busy** months. Two of my
counts move because of it and both are flagged.

---

## Verdicts

| # | Question | Verdict |
|---|---|---|
| 1 | Do the six types earn their place? | **Four do, two do not, and none of the six has a field list that fits.** `Person` and `Organization` earn it but are contact cards — `Person.numbers` has **10 possible values in 13,083 messages** and all ten are conference dial-in numbers. `Commitment` is the densest thing here and the **worst-shaped**: of 8 real commitments in one 300-message window, **0** had a self-contained `what`, **0** had an absolute date, **0** were explicitly closed, and `source_message` is a **required** field with no source on any Archive line. `Media` is right and needs one enum value. `Chat` is right and cannot express time. **`Issue` does not earn its place in the shipped shape** — 21 tracker rows in 18 months against 301 messages using the word to mean a problem. |
| 2 | What is missing? | **`Meeting` — and it is not close.** 134 conference-link messages, 43 distinct join links, 12 mechanical call records carrying duration and attendance, 2 calendar records, 323 messages using a meeting word. **This is the thing an email assistant would not have**: email carries the invite as a separate structured Source, so an email PA never has to *reconstruct* a meeting from prose — a WhatsApp PA has nothing else. Second: **`Account`** — 65 access-and-credential messages in a 14.63% sample and 25 secret-shaped strings pasted into the group. Third and weakest: **`Decision`**, ~3–4 per 300 messages. I proposed and then **rejected** `Transaction` (82 money amounts, 47 on-chain addresses) — it is email-pa's `Price` trap wearing new clothes. |
| 3 | What would a digest produce from one window? | **From W4 — 300 messages, 8 days — roughly 34 documents**: 6 Person updates, 9 Organizations across 4 roles, 6 Issues, 11 Commitments, 6 Meetings, 6 Accounts. Written out in §3. **Not one of the 6 Issues fits the shipped `Issue`**, and 5 of the 6 Meetings exist only as a link plus a sentence. |
| 4 | Where does the mechanical/reasoning line fall? | **Identity is not the only case and is not the sharpest.** Sharper: **"tomorrow" → a date**. All 13,134 lines carry `zone: Africa/Accra` — the *exporting device's* zone — while participants self-report at least eight locations spanning UTC+0 to UTC+4, and the corpus contains two participants misreading the same meeting time in the wild. Also: no Archive line has an identifier, so *what "it" refers to* is mechanically unrecoverable. **And the line runs the other way twice**: which participant is the **principal** is answerable by `grep` (see §4.6), and **sticker-versus-screenshot** is answerable by `file`, saving a vision call on a third of every blob. |
| 5 | How much is unreadable without media? | **The 5.4% headline is mostly stickers and the real number is far smaller — but the damage is in a different place than the count suggests.** Of 703 holes, **381 are 512×512 WebP stickers** (54%) and **95 are voice notes** (13.5%). Strip stickers and the hole rate is **2.5%**. Reading 600 messages containing 78 media references by hand: **0 of ~33 topical threads became unrecoverable**; 5 references (6%) carried a question or artefact with no textual restatement, and in 3 of those 5 **a participant asked for a restatement in-thread and got one**. The group narrates its screenshots. **The thread survives; the entity does not** — the specific error, date, figure or username is inside the blob about half the time. The genuinely dark case is small and countable: **10 stretches in 18 months of two or more consecutive voice notes with no text between them, 22 messages, 0.17% of the corpus.** |

---

## 1 — Does each shipped type earn its place?

`~/.ambient/schema.yaml` declares six types over a closed field vocabulary
(`text · text[] · ref · ref[] · date · enum(a|b|c)`, optional `?`), enforced by one regex at
[`schema.ts:24`](../../../../src/modules/home/internal/schema.ts) **[read]**.

### 1.1 `Person` — earns it, wrong fields

`name · aliases[] · numbers[] · org? · role? · status · source`

**Occurrence.** 14 distinct `who.label`; 12 human-shaped, one an AI assistant, one the group
itself; two collisions leaving roughly 10 humans **[measured, `scope.md`, re-confirmed here]**.

**`numbers: text[]` has no source and the material proves it twice over.** Beyond
`ArchiveMessage.who` being `{ label: string }` **[read,
[`transcript/types.ts:22`](../../../../src/modules/transcript/types.ts)]**, I looked for
numbers in the *text*: **10 E.164-shaped strings in 13,083 messages, and 1 `wa.me` link**
*(instrument: grep, corpus-wide)* **[measured]**. Reading them, every one is a
dial-in number pasted inside a video-meeting invite **[read]**. The field would be empty for
every Person this corpus can produce.

**The field with a real source is absent.** **43 messages contain an email address**
*(instrument: grep, corpus-wide)* **[measured]** — four times the number-count — and `Person`
has no email field, while email-pa's did.

**Two fields `knowledge-flow.md` says the mechanical stub records do not exist.** It states
the stub carries *number/lid, display name, first seen, chats seen in* **[read,
[knowledge-flow.md](../../../design/knowledge-flow.md)]**. `Person` has no `first_seen` and
no `chats`. Of those four facts, exactly one — display name — is both available and
storable.

**The type cannot say what a Person *is to the principal*.** `role: text?` is optional free
text. In my sample the humans divide into at least five relations that a query would want:
the principal himself, colleagues who send messages, an AI assistant that sends messages and
is not a person, the group itself carried on system events, and **externals who never send at
all**. In W4 alone I count **five distinct external humans** — a customer's engineer, a
second customer's team member, a wallet company's regional lead, a conference convener, and a
grant contact — **and not one of them is named in the text** **[read]**. They are referred to
by role and pronoun. A mechanical stub pass sees senders and therefore sees none of them.

**Verdict: keep, but it is a contact card and this is exactly `knowledge-flow.md`'s own
diagnosis of email-pa** — *"That is a contact card. That is frontmatter"* **[read]**. The
prose page carries the person; the frontmatter should carry only what is queryable, and three
of its seven current fields are not fillable.

### 1.2 `Organization` — earns it, and is much bigger than anyone measured

`name · aliases[] · domain? · role? · status · source`

**`scope.md`'s probe found four organisations** (a company, a product, a chain, a legal
entity), by grepping for four names it already knew **[read]**.

**Reading a 14.63% sample, I encountered 49.** Counting each corpus-wide afterwards, **27
appear in 10 or more messages** *(instrument: read to find the names, then grep to count
them)* **[measured]**. Top of the distribution: an auth vendor in 145 messages, a video-call
vendor in 134, a settlement chain in 127, a hosting vendor in 75, a wallet protocol in 69,
a chat platform in 66, a docs platform in 54, a customer in 52, a second customer in 49, a
third in 48.

**They fall into six roles that the type cannot distinguish** **[inference, from reading]**:

| Role | Examples in the sample | Count |
|---|---|---|
| the principal's own company and its two products | Org A, Org B, Org C | 3 |
| paid third-party services — auth, hosting, database, cache, RPC, mail, design, video, analytics, secrets, docs, chat, fonts | — | ~23 |
| chains and protocols the product runs on | — | 8 |
| customers | Cust 1–3, plus one podcast | 4 |
| partners and prospects | Partner 1–11 | 11 |
| competitors | Comp 1–6 | 6 |

`role: text?` is **optional and unconstrained**, and it is the single field a principal would
query on — *who are our customers*, *what are we paying for*, *who did we meet*. It should be
an enum and it should be required.

**One organisation carries three roles at once** — a chain the product deploys to, a grant
programme it applied to, and a partner it negotiates with **[read]**. The closed field
vocabulary has `text[]` and `ref[]` but **no `enum[]`**
([`schema.ts:24`](../../../../src/modules/home/internal/schema.ts)) **[read]**, so a
validated multi-role field cannot be expressed. That is a limit of the vocabulary, not of
the type — see §6.

**Verdict: keep and strengthen.** The distribution `knowledge-flow.md` predicted is right —
`Organization` is dense — but the count it inherited was low by an order of magnitude.

### 1.3 `Commitment` — the densest type and the worst-shaped

`what: text · who: ref · due: date? · source_message: text · status: enum(open|done|dropped)`

Three of five fields are required. I tested each against real commitments rather than against
commitment-shaped language.

**The language probe first, for scale.** In the sample, **107 messages** match a
first-person-promise regex and **65** contain *I'll* or *I will* *(instrument: grep, sample)*
**[measured]**. Corpus-wide, `scope.md` measured 188 `I'll` and 153 `I will` **[read]**. So the
type is unquestionably dense.

**Then the hand count.** I extracted every commitment-shaped line from W3, W4 and W6 — **900
messages, 85 grep hits** **[measured]** — and classified each by reading. Roughly **62 are
genuine commitments** and **23 are false positives** *(instrument: read)* **[inference]**:
*gimme a sec*, *lemme get home*, *I'd bet my 50 naira akara that…*. A 27% false-positive rate
on the probe that produced the "dense" verdict.

**Taking W4 alone — 300 messages, 8 genuine commitments, traced to the end of the window
[read]:**

| Shipped field | How many of the 8 it fits |
|---|---|
| `what: text` — a self-contained description | **0 of 8.** Every one is an anaphor. *check it out*, *lemme review*, *I'm on it*, *I'll simulate and let you know*. The referent is in a message between 1 and 40 lines earlier, and in one case two days earlier. |
| `who: ref` | 8 of 8. This is the one field the Archive fully supplies. |
| `due: date?` | **2 of 8** carry a time expression a script could in principle resolve — *this morning*, *in a few hours*. **0 of 8** carry a date. Two more carry a *precondition* rather than a time (*once I have all the details*), which `date` cannot hold at all. |
| `source_message: text` — **required** | **0 of 8.** No Archive line has an identifier **[read, [`transcript/types.ts`](../../../../src/modules/transcript/types.ts) — `LiveMessage` has `id`, `ArchiveMessage` does not]**. The obvious synthetic key, `at` + `who.label`, **collides on 37 pairs across the 13,083 messages** *(instrument: `jq \| sort \| uniq -d`, corpus-wide)* **[measured]**. It is 99.7% unique, which is not a key. |
| `status` | **0 of 8 explicitly closed in-window.** Four are settled *implicitly* by a later message that mentions no commitment at all — a deploy notice, a merge notice, a screenshot of the working thing. The status is real and derivable, but only by reasoning, and only sometimes. |

**Corpus-wide, the `due` problem is the sharpest number in this document.**
*(Instrument: grep over all 13,083 message texts)* **[measured]**:

```
messages containing a relative due expression
  (today · tomorrow · tonight · this morning/evening/week/weekend ·
   next week · by <weekday> · EOD · ASAP · soon)          731
messages containing an absolute date                       19
```

**A 38-to-1 ratio.** `due: date?` is optional, so nothing breaks — but the field will be
empty in ~97% of the cases it exists for, and the information *is* in the corpus, in words the
type cannot hold. Meanwhile **73 messages are a bare closure word** — *done*, *fixed*,
*merged*, *deployed*, *pushed*, *sorted* — with no indication of what closed
**[measured, grep, corpus-wide]**.

**Verdict: keep, and change four of five fields.** `knowledge-flow.md` calls `Commitment`
*"the WhatsApp equivalent of email-pa's `Document`… the thing with values you need to query"*
**[read]**. It is the right instinct and the wrong shape: an email `Document` arrives with an
identifier, a party and a due date printed on it. A WhatsApp commitment arrives as two words
of anaphora with no identifier, and every value the type wants to be queried on has to be
reconstructed.

### 1.4 `Issue` — does not earn its place in the shipped shape

`title: text · platform: text · repo: text? · number: text? · status: enum(open|closed)`

`platform` is **required**. That single fact decides the verdict.

*(Instrument: grep, corpus-wide)* **[measured]**:

```
distinct GitHub issue / PR URLs, 18 months        21
  clustered:  2026-04 → 7 · 2026-07 → 5 · everything else → 9
messages containing the word "issue" or "issues"  301
messages saying create / file / open / raise an issue     7
```

**301 messages use the word and 7 mean a tracker row.** A ratio of 43 to 1.

Reading them settles what the other 294 are: a problem, reported as prose plus a screenshot,
argued to a root cause in the thread, and fixed — with no row anywhere. W4 alone carries six
of these, of which the sharpest is a fee under-collected on a customer payroll, traced over
two days to a named function choosing a flat helper over a percentage helper **[read]**. It
has a title, an owner, a status and a root cause. It has no platform, no repo and no number.

**The correction in `scope.md` still stands and does not rescue the shape.** That map first
read 21 links as evidence `Issue` is mis-shaped, then withdrew the inference because GitHub is
itself a Source and *"a type fed by its own Source is not sized by how often the other Sources
happen to name it"* **[read]**. That is correct. But this finding is about a different thing:
the **294 problems that live only in WhatsApp and will never reach a tracker**. GitHub being a
Source means Ambient will one day ingest those 21 rows properly. It does not give the other
294 a `platform`.

**And the corpus shows the two populations are diverging, not converging.** In W6 (Jul 2026)
one participant is pushing hard for every problem to become a filed issue — *"we need concrete
issues even if it's 50 issues on the repo"* — precisely because the WhatsApp reports were not
actionable for his agents **[read, paraphrase]**. Fifteen months of prose bugs preceded that
push and are still the bulk of the corpus.

**Verdict: keep the type, make `platform` optional, add `chat: ref?`.** Otherwise a mechanical
`lint` will reject every Issue the reasoning pass can actually write.

### 1.5 `Media` — right type, one missing enum value, and the value is expensive

`hash · kind: enum(image|voice|audio|video|document) · from? · chat? · duration? · status · processed_by?`

**Corpus-wide blob census.** *(Instrument: `file -b --mime-type` over each referenced blob in
`~/.ambient/blobs/`; 1,164 media references, of which 1,139 are `Stored` and 25 are
`NoHandle: placeholder`)* **[measured]**:

| mime | refs | captionless | |
|---|---|---|---|
| `image/jpeg` | 579 | 179 (31%) | screenshots, photos |
| `image/webp` | **381** | **381 (100%)** | **stickers — see below** |
| `audio/ogg` | 95 | 95 (100%) | voice notes (Opus, mono, 16 kHz) |
| `video/mp4` | 44 | 30 (68%) | |
| `application/pdf` | 13 | 0 (0%) | |
| `application/octet-stream` | 7 | 6 | |
| `image/png` | 7 | 0 | |
| `text/plain` | 4 | 0 | |
| docx · xlsx · zip · m4a · heic · html | 9 | 0 | |

**Every WebP reference is captionless, and 207 of the 223 distinct WebP blobs are exactly
512 × 512** *(instrument: `sips -g pixelWidth -g pixelHeight`)*; 220 of 223 are square
**[measured]**. That is WhatsApp's sticker canvas. **[inference]** These are stickers, not
images — they are punctuation, and they are **33% of every blob reference in the corpus**.

`Media.kind` has no `sticker`. A mechanical `media stub` pass would therefore file all 381 as
`kind: image, status: unprocessed`, and the processing loop would **send a third of the
corpus's blobs to a vision model to be described** **[inference]**. That is the concrete cost
of one missing enum value, and the classification that avoids it is `file` plus a dimension
check — no model, no judgement.

`duration: text?` is already a concession that the vocabulary has no numeric form. Noted, not
a defect of this type.

**Verdict: keep. Add `sticker` to `kind` and `skipped` to `status`.**

### 1.6 `Chat` — right, and cannot express what this chat did

`name · participants: ref[] · purpose? · mode: enum(ingest|speak)`

One chat **[measured]**. `mode` is configuration and the corpus says nothing about it.

`participants: ref[]` is **a set with no time**, and this chat's membership is a timeline.
Across the 51 events **[measured, `jq` over `kind:"event"`]**: 6 people added, 4 removed, 1
joined from a community, 2 phone-number changes, 1 rename, the group added to a community and
then removed from it and the community deactivated. Fourteen labels have sent messages; on my
reading roughly eight humans are current. Every step of that reduction is judgement.

Separately, **mentions name a fifteenth participant who never sent a message** *(instrument:
grep for the mention delimiters `U+2068 … U+2069`; 15 distinct mention targets across 2,913
mention tokens, 14 matching sender labels, 1 not)* **[measured]**.

**Verdict: keep.** The interval problem is a vocabulary limit (§6), not a type defect.

---

## 2 — What is missing

Three proposals, each with a sample count and a justification, then three rejections. The
rejections matter more than the proposals: they are the evidence I applied the *"a type that
fires twice in 18 months is not a type"* test rather than asserting it.

### 2.1 `Meeting` — add. This is the gap.

*(Instrument: grep, corpus-wide)* **[measured]**:

```
messages carrying a video-call join link            88
  distinct join links                               43
messages carrying a second video platform's link    21
messages carrying a recording link (with passcode)  18
messages carrying an event / booking link            7
messages using a meeting word
  (meeting · standup · weekly call · roundtable)   323
```

*(Instrument: `jq` over `kind:"event"`)* **[measured]**: **12 call records** carrying a
duration and a joined-count — `Voice call, 28 min • 4 joined`, `Missed video call, 1 hr •
4 joined` — and **2 calendar records**, one updating a named recurring meeting and one
cancelling it.

**Why this and not something else is the answer to "the one thing an email assistant would not
have".** An email PA gets the calendar as a *separate, structured Source*: the invite carries
a title, a start time, an attendee list and an identifier. It never has to reconstruct a
meeting. A WhatsApp PA has only the chat, and in this chat the meeting is the **unit of
work** — it is announced by a link and a sentence, it is rescheduled by argument across
timezones, it produces commitments, and its output is a summary posted back into the chat as a
link to a docs page **[read]**. Fifteen of the 18 months contain a standing weekly meeting.
There is no type for any of it.

**It is also the only proposal with a mechanical stub trigger already on disk**: the 12 call
events give a time, a duration and an attendance count with no model at all.

**One honest caveat.** 43 distinct join links against 88 mentions **[measured]** — most of
those are the *same recurring meeting* re-posted. A `Meeting` per link would produce 43
documents where the truth is one series plus a dozen ad-hoc calls. Whether a recurring meeting
is one document or many is a real modelling question this finding does not settle.

### 2.2 `Account` — add, with a hard boundary

*(Instrument: grep, sample of 1,922 lines)* **[measured]**:

```
messages asking for or reporting access
  (need/send/share/give/don't have + access|key|invite|login|password)   38
messages about membership of a service
  (add me to · added you · requested access · no access)                 27
```

*(Instrument: grep, corpus-wide)* **[measured]**: **25 messages contain a secret-shaped
string** — a publishable-key prefix, a builder code, an uppercase `*_KEY=` assignment.
Reading them, one is a link to a shared vault entry for a deployment private key, and several
are environment blocks pasted whole **[read]**.

**The corpus contains the damage from getting this wrong, not just the language.** In W6 a
participant is locked out of the design tool because the bill went unpaid, and another has
revoked almost everyone's docs access for the same reason; in W4 an engineer cannot debug
production because he has no console access to the auth vendor or the hosting vendor, and asks
for everything to be moved into a secrets manager **[read, paraphrase]**. *Who can do what,
and what are we paying for* is a standing question the group asks itself repeatedly and
answers badly.

**The boundary, stated as part of the proposal: an `Account` document never holds a secret.**
It holds the service, the holders, and the state. If it held the value it would be a
credential store, and this project has no business being one.

### 2.3 `Decision` — add, and it is the weakest of the three

**[inference, from reading]** In W4 I count 3 decisions with a durable consequence; in W5, 4.
That extrapolates to roughly **150 across the corpus** — real, but an order of magnitude
thinner than `Commitment`, and a tenth of `Meeting`'s language footprint.

The grep probe says 70 messages in the sample match decision-shaped language
**[measured]** — but that is a *language* count and I do not trust it for this type, because
the same words carry proposals, arguments and jokes. The read count is the honest one.

The reason to add it anyway: decisions in this corpus are **reversed and re-litigated**, and
nothing else records that. A choice of auth vendor made in month 1 is still constraining
month 18; a pagination decision is made, forgotten, and rediscovered as a bug six weeks later
**[read]**. `Commitment` cannot hold it — a decision has no owner who owes it and no due date.

**If one of the three is cut, cut this one.**

### 2.4 Rejected — `Transaction` / `Payment`

*(Instrument: grep, corpus-wide)* **[measured]**: **82 messages contain a currency amount**
and **47 contain an on-chain address or transaction hash**. Both are trivially extractable and
would produce a large, clean, mechanically-generated table.

**That is exactly why it must not be built.** It is email-pa's `Price` in a different domain —
*"Price 1353 · Document 206 · Organization 18 · Person 4"*, a graph that excelled at
mechanical extraction and undercounted humans **[read,
[knowledge-flow.md](../../../design/knowledge-flow.md)]**. These amounts are the *product's*
data, not the principal's knowledge. `knowledge-flow.md` says *"`Price` has no analogue here.
That is precisely why the graph shrinks"* **[read]**. It has an analogue. Declining it is the
decision, and it should be written down so the next person does not rediscover it and take the
bait.

### 2.5 Rejected — `Event` (conference, summit, hackathon)

**32 messages** across 18 months *(instrument: grep, corpus-wide)* **[measured]**, roughly ten
distinct occasions on my reading. Below the threshold. It is a `Meeting` with an external kind,
or it is prose on an `Organization`.

### 2.6 Rejected — `Repository`

**Ten distinct repositories under the principal's organisation** across 18 months
*(instrument: grep for repo URLs, corpus-wide, then dedupe)* **[measured]**. Real, but
`Issue.repo: text?` already holds it, and a `Repository` type with ten instances and no
queries against it is scaffolding.

**[inference]** The question hiding underneath it — whether there should be a `Project` type,
since every message in 18 months hangs off one of about five named codebases and two products
— is a genuine one, and I am not proposing it because **nothing mechanical could ever queue
one**. A type with no stub trigger has no work queue, and `knowledge-flow.md`'s whole shape is
*mechanical creates slots, reasoning fills them* **[read]**.

---

## 3 — What a `digest` pass should actually emit from one window

**W4 — lines 6998–7297, 1–8 November 2025, 300 messages, 8 days.** Anonymised. This is the
most useful section in the document because it makes the abstract pipeline concrete: it is
what the reasoning pass produces, in the shipped types plus the proposed ones, and the places
it cannot are marked.

**Persons — 6 updates, 0 new stubs.** All six senders already have mechanical stubs. The
digest fills them: P1 runs the company, holds the vendor accounts, tests the product by hand
and does business development; P2 owns backend and contracts, is a student with unreliable
network, and repeatedly lacks access to the tools he needs; P4 owns the frontend and is the
only person who merges and deploys; P6 and P9 do marketing and outreach; P7 handles social and
inbound. **Five external humans appear and none can become a document** — a customer's
engineer, a second customer's team, a wallet company's regional lead, an event convener and a
grant contact are all referred to by role and pronoun, never named. The correct output is a
`[assumed]` note on the relevant `Organization`, not a `Person` with a placeholder name.

**Organizations — 9, across 4 roles.**

| Doc | Role | What the window establishes |
|---|---|---|
| Cust 1 | customer | Onboarding failed 3 Nov — org contracts silently did not deploy; a migrate button shipped the same day; org successfully recreated 6 Nov; still no email alerts and no transaction-table update by 8 Nov |
| Cust 2 | customer | Six team members onboarded 1 Nov; ran a $689.40 payroll 7 Nov; reported a missing pay-now option and a scheduling failure at 07:54 for an 08:00 payment |
| Partner 1 | prospect | Wallet company; regional lead open to integration (3 Nov) |
| Partner 2 | prospect | Chain foundation; meeting held 4 Nov, two engineers did not attend |
| Partner 3–5 | prospect | Met in person 7 Nov; one pays fiat only, one already uses Comp 1, one will partner and invest |
| Comp 1 | competitor | Named as the incumbent a prospect already uses |
| Comp 2 | competitor | Discovered 5 Nov; offers payroll to both teams and individuals |

**Issues — 6, and not one fits the shipped type.**

| Title | Owner | Status at window close | `platform` |
|---|---|---|---|
| Organization deployment can silently fail, leaving a user holding contract addresses for contracts that were never deployed | P2 | worked around, not fixed | *none* |
| No email alert is sent on an incoming payment | P2 | open — raised 3 Nov, still open 6 Nov | *none* |
| Transaction table does not update after a completed payment | P2 | open | *none* |
| Payment date renders wrongly; previously reported and not fixed | P4 | open | *none* |
| Fee under-collected: $3 taken on a $689.40 payroll where $6.89 was due. Root cause found 8 Nov — the fee helper returns a flat value where the percentage helper multiplies by the total | P2/P4 | root cause agreed, fix not confirmed | *none* |
| Users behind a US-exit VPN cannot create an account (auth vendor geo-restriction) | P1 | diagnosed, unresolved | *none* |

**Commitments — 11.** The `due` column is the finding.

| what | who | words used | resolvable date? | status at close |
|---|---|---|---|---|
| check the failing sign-up | P2 | *this morning* | yes → 1 Nov | done (implied) |
| share the marketing plan | P9 | *on the call tomorrow* | yes → 3 Nov | unknown |
| review the failed deployment | P2 | — | no | done |
| simulate the migration and report | P2 | — | no | superseded — the migration was later declared unnecessary |
| tell the customer about the migrate button | P1 | *later today* | yes → 4 Nov | done |
| share the cache and RPC keys | P2 | *once I have all the details* | **no — a precondition, not a time** | open |
| get the vendor logins sorted | P1 | — | no | partial |
| publish the booking link | P1 | *this evening* | yes → 5 Nov | done |
| fix the payment date | P4 | *this morning* (assigned by P1) | yes → 7 Nov | open |
| add a pay-now option | P4 | — | no | open |
| hold a weekend workshop and clear the list | team | *before Monday* | yes → 10 Nov | unknown |

Four of eleven carry a resolvable relative expression; **zero carry a date**; **zero carry a
message identifier**; one carries a precondition the `date` form cannot hold; and `status`
required reading forward in every case.

**Meetings — 6, of which 5 exist only as a link and a sentence.** An onboarding call with
Cust 1 (3 Nov, announced 73 minutes ahead); a team call (3 Nov evening, summary published to a
docs page afterwards); a meeting with Partner 2 (4 Nov, two engineers absent and told so); the
standing Monday call (5 Nov, one participant missed it and asked what he missed); an ad-hoc
debugging call (7 Nov morning); an in-person event (7 Nov) at which three prospects were met.
**Zero call events fire in this window** — every one of the six is prose.

**Accounts — 6.** The auth vendor (P1 has no console access, P2 does); the hosting/backend
platform (Google sign-in only, P2 locked out, a call scheduled to fix it); the cache service
(P2 and P4 both need the key, which lives in a password manager and was given wrong once); the
RPC provider; the secrets manager (P2 asks for all product credentials to be moved into it);
the chat platform (the outreach channel where the sales deck and roadmap live).

**Media — 31 references, of which the digest should refuse to trust 2.** One voice note in the
middle of the fee argument, and one screenshot posted with a bare *"the cause?"* whose subject
appears nowhere in text. The other 29 either carry a caption or are answered in the next
message.

**Total: ~34 documents from 300 messages.** Roughly one document per nine messages, of which
about a third are updates to existing stubs rather than new files.

---

## 4 — Where the mechanical / reasoning line actually falls

`knowledge-flow.md`'s rule is *"anything a script can be wrong about, a script must not do"*,
and its worked example is identity **[read]**. Identity is real, is not the sharpest case, and
the line runs in **both** directions.

### 4.1 Identity across a number change — looks mechanical because the corpus hands you the join

The two collisions in `scope.md` are not coincidence, and the corpus explains them exactly.
*(Instrument: `jq` over events, plus first/last message timestamp per label)* **[measured]**:

```
label P5  last message   27/04/2025 17:21:22
event     number-changed 27/04/2025 17:21:22   ← same instant, names P5
label P4  first message  29/04/2025 04:17:26   ← 2 days later, zero overlap

label P1  last message   25/05/2026 09:17:38
event     number-changed 25/05/2026 09:17:38   ← same instant, names P1
label P8  first message  25/05/2026 17:59:54   ← 8 hours later, zero overlap
```

In both cases the old label goes silent at the *exact millisecond* of the event and the new
label appears within days, and in both cases no other new label appears anywhere near that
window **[measured]**.

**This is the strongest possible mechanical evidence and it is still not a merge.** The event
names the **old** label and never the new one **[read]**. The link is only visible here because
both people kept the same display name — one gained a leading tilde, the other a tilde and an
emoji. Had either changed their display name in the same act, the join would be invisible and
the same script would silently produce nothing. **[inference]** The correct behaviour is what
the mechanical pass should do *more* of, not less: **emit the evidence as a queued proposal** —
the event, the silence boundary, the absence of other candidates — and let a reasoning pass
accept it. Emitting nothing is as wrong as merging.

### 4.2 A relative deadline into a date — the sharpest case, and it is not identity

This one looks purely arithmetic: `at` is epoch milliseconds, `zone` is an IANA zone, so
*tomorrow* is a date-math call.

**All 13,134 lines carry `zone: "Africa/Accra"`** *(instrument: `jq -r .zone | uniq -c`)*
**[measured]** — one zone, no exceptions. That is the **exporting device's** zone, which is
what a WhatsApp export writes.

Participants are not in it. *(Instrument: grep for self-reported locations in message text —
the place names stay on the machine; only the shape is reported here)* **[measured]**: **16
distinct countries and cities**, the top four appearing 28, 23, 17 and 13 times, spanning
**UTC+0 to UTC+4**. And **48 messages contain the phrase "my time" or "your time"**
**[measured]**.

**The failure is in the corpus in the wild.** In W6, on the same day, one participant reports
that a meeting was shifted to a time that lands during his class, and another apologises for
having believed the meeting was an hour earlier *"my time"* **[read, paraphrase]**. Two humans
in one group resolved the same stated hour to two different instants.

**[inference]** So *tomorrow*, resolved with `at` + `Africa/Accra`, is wrong whenever the
promisor is east of Accra and promising late at night — and 731 messages in this corpus carry
a relative expression while 19 carry a date. A script that resolves these is not doing
arithmetic; it is guessing at a fact — the sender's location at that moment — that the Archive
does not carry and that changes: one participant moved between four cities inside my sample.

### 4.3 What a message refers to — mechanically unrecoverable, not merely hard

`ArchiveMessage` carries `wall · at · zone · who.label · text`, optional `edited`, `deleted`
and `media`. `LiveMessage` carries `id`, `quoted: { id, from }` and `mentions`
**[read, [`transcript/types.ts`](../../../../src/modules/transcript/types.ts)]**.

So for 100% of the material on disk there is **no reply edge**. Combined with §1.3's finding
that **0 of 8 commitments had a self-contained `what`**, the consequence is exact: filling
`Commitment.what` for an Archive line is *always* a reasoning act, never a lookup. There is
nothing to look up.

### 4.4 An organisation from a capitalised token — the classic false mechanical

`scope.md` measured a chain's name in 279 messages by grep **[read]**. Reading them, the token
is also an English word used as itself. The same is true of a wallet protocol whose name is an
adjective, and of a stablecoin issuer whose name is a common noun. Three of the top ten
organisations in this corpus have names that are ordinary English words **[read]**. Any
mechanical entity-extraction over capitalised tokens produces a mess, and the mess is not
detectable from the counts.

### 4.5 Mentions — mechanical, and easy to get silently wrong

*(Instrument: grep for the `U+2068 … U+2069` mention delimiters, corpus-wide)* **[measured]**:
2,913 mention tokens across 15 distinct targets; 2,376 messages contain an `@`; 66 use the
all-members mention.

The trap: a sender label spells the unverified-contact marker as `~` **followed by U+202F**
(narrow no-break space), and the *mention* spells it as `~` with **no space at all**
**[measured, `hexdump` over both forms]**. **899 mention tokens — 31% of all mentions —
reference the seven tilde labels** and none of them string-match their sender label. This is
mechanical work, but a naive equality check drops a third of the edges and reports success.

### 4.6 Which participant is the principal — a `grep` answers it, and nothing can store it

WhatsApp writes two different strings for a removed message, and the export preserves the
difference. *(Instrument: `jq` over every line with `deleted: true`, corpus-wide)*
**[measured]**:

```
"You deleted this message."        25 occurrences, on exactly ONE label
"This message was deleted."        36 occurrences, across SIX other labels
overlap                             0
```

**The export names the principal, deterministically, with no model.** Two further events —
one adding "you" to the group and one making "you" an admin — confirm a principal exists but
carry the *group's* label rather than a person's, so they are half-signals **[read]**.

`schema.yaml` has nowhere to put this. `Person.source: enum(history|witnessed)` is
*provenance of a fact*, not *identity of the reader*
**[read, [CONTEXT.md](../../../../CONTEXT.md) via `scope.md`]**. `Chat.participants: ref[]`
treats all fourteen alike. **[inference]** This matters more than it looks: every commitment
in the corpus is either *owed by* or *owed to* the principal, and the type system cannot
currently tell which.

**Caveat:** it works only because the principal deleted 25 messages. In a chat where he never
deleted, the signal is absent entirely.

### 4.7 Sticker versus screenshot — no model needed, and the saving is large

§1.5's measurement: 381 WebP references, 100% captionless, 207 of 223 distinct blobs exactly
512 × 512 **[measured]**. `file` and a dimension check separate punctuation from evidence
across a third of the blob store, and the alternative — sending them to a vision model —
costs a third of the media budget to learn that someone sent a cartoon.

**[inference]** This is the direction the dividing line is usually drawn wrongly in: not a
script doing a model's job, but a model doing a script's.

---

## 5 — How much of the corpus is unreadable without media

### 5.1 The headline number is mostly punctuation

`scope.md` reports **703 lines are a media reference with empty text — 5.4% of the
Transcript** **[read]**, re-confirmed here **[measured]**. In my sample the rate is 119 of
1,912 messages, **6.2%** **[measured]** — slightly higher, consistent with the sampling bias
toward busy months.

Decomposing those 703 by blob type *(instrument: `file -b --mime-type`, corpus-wide)*
**[measured]**:

| | holes | share |
|---|---|---|
| stickers (512×512 WebP) | 381 | **54%** |
| screenshots and photos (captionless JPEG) | 179 | 25% |
| **voice notes** | **95** | **13.5%** |
| video | 30 | 4% |
| unidentified + `NoHandle` placeholders | ~18 | 3% |

**Strip stickers and the hole rate is 322 of 13,083 — 2.5%.** Strip stickers and video and
what remains is 274 references, **2.1%**.

### 5.2 The number that matters: how often the thread breaks

I hand-classified **every media reference in W4 and W5 — 600 messages, 78 references**
*(instrument: read, with two messages of context either side)* **[read]**:

| Class | Count | Share |
|---|---|---|
| **Decorative** — a sticker, a photo, a joke. The thread does not refer to it. | 34 | 44% |
| **Evidence with a stated verdict** — the blob is the proof, and the surrounding text states what it proves. | 39 | 50% |
| **Load-bearing** — the blob carries a question or an artefact with no textual restatement. | **5** | **6%** |

**Thread-level: 0 of roughly 33 topical threads in those 600 messages became unrecoverable**
**[inference, from the read]**. And in **3 of the 5 load-bearing cases, a participant asked for
a restatement inside the thread and got one** — most explicitly when someone posted a voice
note and another member simply asked for a summary of it, which was then given in text
**[read, paraphrase]**.

**This group narrates its screenshots.** A member posts a screenshot, and either captions it
with the conclusion or is told the conclusion two messages later. That is why the thread
survives.

### 5.3 Where the damage actually is — the entity, not the thread

The 39 evidence-with-a-verdict cases are the problem, not the 5. The text says *the table is
not updating*, *the date is still wrong*, *this is the error*, *new error*. The digest can
write those `Issue` titles. It **cannot** write which date, which error, which figure, which
username — because that is in the image. In W7 an entire multi-day support thread turns on a
username a customer could not claim, and the error itself is only ever a screenshot; the
username reaches text only because someone typed it out on the third day of asking
**[read, paraphrase]**.

So: **a digest run against unprocessed media produces documents that are structurally correct
and factually thin.** That is precisely the failure mode `scope.md` names as unrecoverable —
*"An entry that reads as thin is worse than one that reads as missing, because only the second
one gets fixed"* **[read]**.

### 5.4 The genuinely dark case, sized

*(Instrument: a Node script over the corpus resolving each media reference to a mime type and
finding runs of consecutive voice notes with no text-bearing message between)* **[measured]**:

```
voice notes, corpus-wide                                       96
runs of 2 or more consecutive voice notes                      10
longest run                                                     4
messages inside such runs                                      22   (0.17% of the corpus)
voice notes by month: 19 · 19 · 2 · 7 · 3 · 2 · 6 · 7 · 1 · 3 · 0 · 0 · 1 · 16 · 4 · 0 · 2 · 4 · 0
```

The longest run is in W1: inside an argument about whether to cut scope before an MVP launch,
two participants exchange six voice notes in nine minutes, four of them consecutive with no
text between. One side's entire case is audio **[read]**. That thread is dark, and no amount
of narration recovers it — the text that follows *replies* to something never written down.

**Ten stretches in 18 months.** That is the number worth carrying, and it is two orders of
magnitude below 5.4%.

**And one class is unrecoverable at any price**: 25 references are `NoHandle: placeholder`
**[measured]**, meaning the export shipped the message and not the bytes. Those cannot be
processed by any model.

---

## 6 — Proposed schema delta

Every field below is legal under the FORM regex at
[`schema.ts:24`](../../../../src/modules/home/internal/schema.ts) **[read]**. Comments mark
what changed and why; strip them to paste.

```yaml
Person:
  name: text
  aliases: text[]
  emails: text[]                 # ADD — 43 addresses in text; `numbers` has 10 and all are dial-ins
  numbers: text[]                # KEEP but expect empty for Archive-only Persons
  org: ref?
  role: text?
  relation: enum(principal|colleague|external|bot|group|unknown)
                                 # ADD — 2 of 14 labels are not people; the principal is
                                 #       mechanically identifiable (§4.6) and unstorable today
  first_seen: date               # ADD — knowledge-flow.md already claims the stub records it
  chats: ref[]                   # ADD — ditto
  status: enum(unreviewed|reviewed)
  source: enum(history|witnessed)

Organization:
  name: text
  aliases: text[]
  domain: text?
  role: enum(principal|product|vendor|customer|partner|competitor|protocol|unknown)
                                 # WAS text? — 49 orgs in a 14.6% sample across 6 roles,
                                 #             and this is the field a principal queries on
  status: enum(unreviewed|reviewed)
  source: enum(history|witnessed)

Commitment:
  what: text
  who: ref                       # the promisor
  to: ref?                       # ADD — most commitments in this corpus are owed to someone named
  chat: ref                      # ADD — there is no message id, so the chat is the finest citation
  said_at: date                  # ADD — the day it was said; the only locator an Archive supplies
  source_message: text?          # WAS required — no Archive line has an identifier, and
                                 #                at+label collides on 37 pairs
  due: date?
  due_said: text?                # ADD — 731 relative expressions against 19 dates; keep the words
                                 #       so the resolution is auditable and correctable
  status: enum(open|done|dropped|superseded|unknown)
                                 # ADD superseded, unknown — 0 of 8 in W4 closed explicitly

Issue:
  title: text
  platform: text?                # WAS required — 301 messages mean "a problem", 21 links mean "a row"
  repo: text?
  number: text?
  chat: ref?                     # ADD — where a conversation-only Issue came from
  status: enum(open|closed|unknown)

Media:
  hash: text
  kind: enum(image|sticker|voice|audio|video|document)
                                 # ADD sticker — 381 refs, 33% of all blob references,
                                 #               100% captionless, 512x512, and currently
                                 #               destined for a vision model
  from: ref?
  chat: ref?
  duration: text?
  status: enum(unprocessed|processed|failed|skipped)
                                 # ADD skipped — the terminal state for a sticker
  processed_by: text?

Chat:
  name: text
  participants: ref[]            # a set with no time; see the vocabulary limits below
  principal: ref?                # ADD — §4.6
  purpose: text?
  mode: enum(ingest|speak)

# ---- new types ----

Meeting:                         # ADD — 134 conference-link messages, 43 distinct links,
                                 #       12 mechanical call records, 2 calendar records
  title: text
  when: date
  time_said: text?               # the vocabulary has no time-of-day form and this corpus is
                                 # entirely about time of day across 8 self-reported locations
  duration: text?                # mechanical for the 12 call events; text because there is no number
  attendees: ref[]
  invited: ref[]
  chat: ref
  kind: enum(recurring|adhoc|external|call|unknown)
  status: enum(scheduled|held|missed|cancelled|unknown)

Account:                         # ADD — 65 access messages in a 14.6% sample.
                                 # NEVER holds a secret value. See §2.2.
  service: ref                   # -> Organization
  holders: ref[]
  chat: ref?
  kind: enum(saas|infrastructure|social|financial|other)
  status: enum(active|requested|revoked|lapsed|unknown)

Decision:                        # ADD — the weakest of the three; ~3-4 per 300 messages.
                                 # Cut this one first if three is too many.
  what: text
  who: ref[]
  when: date
  chat: ref
  supersedes: ref?
  status: enum(standing|reversed|unknown)
```

### Four limits of the closed field vocabulary this material exposed

These are not type defects; they are what the material asked for and the grammar cannot say.
Recorded because *"if it is not expressible, that itself is the finding"*.

1. **No `enum[]`.** One organisation in this corpus is simultaneously a protocol the product
   deploys to, a grant programme it applied to, and a partner it negotiates with **[read]**.
   `role` must therefore be either one validated value or an unvalidated `text[]`. I chose one
   enum and accepted the loss.
2. **No time of day.** `date` is the only temporal form **[read, `schema.ts:24`]**. Every
   meeting in this corpus is about *what hour*, and §4.2 shows the hour is where the whole
   thing goes wrong. `Meeting.when: date` cannot say 15:00, and `time_said: text?` is a
   workaround, not a fix.
3. **No numeric form.** `Media.duration: text?` already concedes it. `Meeting.duration`
   inherits the same concession even though the 12 call events supply an exact number.
4. **`ref` has no target type.** `Commitment.who: ref` can legally point at an `Organization`,
   a `Media` or itself. Nothing in the grammar or in `lint` prevents it.

---

## What this does not establish

- **Whether these findings hold for the other 85.37%.** Seven windows read as conversation is
  not a census. The sample is deliberately biased toward the *start* of busy months, and the
  two places that most plausibly moves a number are the media hole rate (6.2% sampled against
  5.4% corpus-wide) and the commitment density.
- **The corpus-wide count of anything I classified by hand.** The 8 genuine commitments, the
  78 media classifications, the 33 threads, the 3–4 decisions per window and the ~34 documents
  per window are all **[read]** or **[inference]** over 300–900 lines. Only the greps, the
  `jq` counts and the blob census are corpus-wide.
- **Whether the WebP blobs really are stickers.** 207 of 223 are exactly 512×512 and 100% are
  captionless **[measured]**; that they are stickers rather than square captionless images is
  **[inference]**. I did not open one. Confirming it is one `sips` call and one human glance,
  and it should be done before the schema delta lands, because it is load-bearing for §1.5 and
  §5.1.
- **Whether `Meeting` is one document per occurrence or per series.** 43 distinct join links
  mostly re-post one recurring meeting. This finding names the question and does not answer it.
- **What a reasoning pass would actually emit.** §3 is what I believe a good digest *should*
  produce from W4. No pass was run. The first real run against that window is the falsifier,
  and it is cheap.
- **Anything about media content.** No blob was opened, decoded, transcribed or described. The
  entire media section is byte-level: mime type, dimensions, byte size and caption presence.
- **Anything about the other Sources.** `Source.kind` is `"whatsapp" | "email"` **[read, via
  `scope.md`]**, GitHub is a Source and is not in the model, and this finding reached exactly
  one WhatsApp Archive.
- **Nothing was written.** `~/.ambient/` was read with `jq`, `file`, `sips`, `stat` and
  `hexdump` only. No file there was created, edited or deleted, and no `ok` command was run.
