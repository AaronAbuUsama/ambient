# 06 — the frontier dispatches itself, and cannot answer itself

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** 02

Step 3 is the only one of six with no skill. The answer is not a seventh skill — it is two
rows in a table that already exists.

## Done when

- The driver's dispatch table gains, for step 3:
  `research` → `.agents/skills/vendor/research/SKILL.md`, as a background subagent;
  `spike` → `.agents/skills/vendor/prototype/SKILL.md`.
- `grilling` **has no row**, and `task` hands back with its checklist.
- The absence of that row is the mechanism, and is stated as such in the skill — so
  [`slices.md`](../../../rules/slices.md)'s *"an agent that answers its own grilling
  questions has broken this"* stops being prose an agent might obey.
- Spec gate row **9** passes.

## Governed by

- [slices.md](../../../rules/slices.md) § 3 — the four kinds, and HITL versus AFK.
- **`spike` is our word, `prototype` is theirs.** [CONTEXT.md](../../../../CONTEXT.md); the
  path is the vendored skill's, the kind name is ours.
