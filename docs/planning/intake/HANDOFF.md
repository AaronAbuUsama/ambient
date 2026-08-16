# Handoff — 2026-08-16, end of session

Written at the end of a long context window. Read this, then
[scope.md](scope.md). Everything below is state, not plan.

---

## Where the work stands

**SKELETON is closed.** `ambient init · doctor · chat add · agent add`. 18/18 gate,
`vp check` / `vp test` / `pnpm shape` green, fallow 0.0%, zero throws. Tagged
`skeleton-closed`.

**INTAKE is scoped, not specified.** `scope.md` is the product of a day of measurement
against the principal's real account. **Read its retractions, not only its conclusions** —
the history question was answered wrongly twice before settling.

## The one thing in flight

`.spike-private/history/spike.ts` was running when the session ended. It answers, in order:
whether the **258 media messages with no blob** are recoverable, whether voice notes
download, whether a fresh sync yields more than 2,739 messages, and whether `requestHistory`
returns anything on an iPhone primary.

- It writes `summary.json` next to itself. **Check that first.**
- `run4.log` is the live log. Last seen: `phase: authenticated (draining)`, `0 msgs in`.
- If it never went online, it is likely stuck in the post-pairing reconnect. Re-run it;
  the credential is valid.

**A fresh pairing was completed this session** — the 15 August credential had been revoked.
`pair.ts` is the reusable QR flow: it renders the code to the terminal, to `qr.txt`, and to
`qr.html` which it opens in a browser. The stale credential is preserved at
`account-stale-*/`.

Two bugs were introduced and fixed in `spike.ts` while wiring the fresh credential; both
carry comments. The `ACCOUNT_ID` lookup must read the **live** working copy, not the
baseline — the fresh pairing writes under its own account namespace.

## Not yet written into scope.md

**1. The pairing and sync surface is a product concern, not a spike artefact.**

The browser QR was built as a spike convenience and turned out to be the shape the CLI
needs. Every user of Ambient pairs once; a QR printed to a terminal is unscannable when
piped and stale within 20 seconds.

It should:

- **refresh itself** as the code rotates, rather than needing a reload
- **show live status** — waiting → scanned → authenticating → syncing
- **show sync progress** — chats seen, messages arriving, oldest date reached

The principal's words: *"it's syncing now but nothing's happening on the screen."* The
socket knows all of it; nothing renders it. **Pairing and first-sync are one screen**, and
it is the first genuinely user-facing surface Ambient has. Per
[../../rules/artefacts.md](../../rules/artefacts.md) it is designed with `impeccable`, not
improvised.

**2. Whatever the spike reports.** Fold the numbers in, then write the spec.

## The pattern worth carrying

Three wrong answers today, all on the history question, all from reading one layer and
stopping — and the answer was in the repo each time. Twice the correction came from the
principal saying a measurement contradicted what he knew about his own data. **When that
happens, doubt the measurement.**

And: every good property this codebase has came from a check that existed *before* the work
began. The two things that came out badly — an unreadable 696-line file, and an ugly report
— were both things no check covered. `pnpm shape` and `docs/rules/artefacts.md` exist
because of those two.
