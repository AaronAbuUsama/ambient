# Ledger — the entries the roadmap no longer carries

[`roadmap.md`](../design/roadmap.md) keeps the newest three and links here for the rest. This
file is **append-only and never edited**: an entry moves here verbatim, including the parts
that turned out to be wrong, because a ledger that is tidied stops being evidence.

Newest first.

- **2026-08-17** — **The method is a rule, not folklore.**
  [../rules/slices.md](../rules/slices.md): map → design → frontier → plan → build → close,
  one gate each, an open question carrying a kind. Nine upstream skills vendored — those
  something here names, closed under their dependencies — because `modules.md` requires
  `codebase-design`'s words *exactly*. `close-slice` gains **definition-of-done row 10**, the
  call graph, read not run.
  **Learned:** IMPORT passed rows 1–9 while its topology was wrong, so every existing row
  measured behaviour and none measured shape. And vendoring all 35 skills was copying instead
  of thinking — the set had to be *traced*, not swept in.

- **2026-08-17** — **IMPORT closed**, then corrected on the real home. All three Archive
  forms produce one Transcript, global deduplicated Blobs, a verbatim primary source and a
  hash-addressed Receipt; 16/16 gate. Reader v2 uses WhatsApp's structural mark and
  atomically replaces corrected Transcripts: 13,134 lines, 1,139 refs → 980 verified Blobs.
  **Learned:** counting by prose regex was wrong twice — 174 "events" were word occurrences,
  and the corrected 105 over-classified 73 Messages while missing 19. The source-marked
  answer is **13,083 Messages + 51 Events**, and the primary source is kept so a
  misclassification is re-readable without a re-export.

- **2026-08-17** — **INTAKE split into IMPORT and INGEST.** The halves share only an output
  type; the order is forced because a full sync is **one-shot per credential**, so the write
  path ships first. **ADR 003 gained two amendments.** Settled by measurement: zip names
  decode as UTF-8 (0 of 1,140 flagged), the dedup key is the **wall clock** (1 collision in
  13,134), and the Transcript line is a **union on provenance**.

- **2026-08-17** — **The lexicon exists.** [../../CONTEXT.md](../../CONTEXT.md), governed by
  [../rules/language.md](../rules/language.md): one meaning per noun, plus the words not to
  use. Written because *"backfill"* named two operations and produced four wrong answers in
  one session.

- **2026-08-16** — **Conventions made runnable.** `vp run shape` checks what AGENTS.md only
  claimed — file length, the six slots, `internal/` privacy, no `../..`, no `throw`, every
  cross-link. The contract split into one file per rule under [../rules/](../rules/), each
  naming its check or *"not currently checked"*. Duplication baseline **0 lines**.

- **2026-08-16** — **INTAKE scoped** against the principal's real iOS account. The mirror
  spans four years with no media refs; the accepted log spans ten days and carries them —
  so history import and continuous ingestion read different stores. **Corrects
  `thesis.md`'s cold start**: the graph is rich (1,560 contacts, 913 chats, 2,417 aliases)
  but conversation history is thin (2,739 messages, 90% from 2026). True of people, not of
  conversations. Six open questions block the spec; the highest-value one is whether
  `whatsappd` can pull deeper history.

- **2026-08-16** — **SKELETON closed.** `ambient init · doctor · chat add · agent add`;
  18/18 gate against real temp directories. Design-it-twice on both load-bearing seams —
  `home` → [ADR 001](../adr/001-home-interface.md), `work` → [ADR 002](../adr/002-work-interface.md),
  provisional. **OpenKnowledge is vendored, not called**: `ok init` writes a nested `.git`
  and six editor directories to deliver one file of defaults.
  **Learned:** six ADR 001 statements were wrong on contact and are in its Amendments, while
  the decision they support survived all six — which is the case for amendments over edits.

- **2026-08-16** — Design phase closed. Product model, knowledge flow, seam map and
  engineering contract agreed in one session; nine slices named and ordered. No code.

---
