# The seam map

Every module, what it owns, and which way dependencies flow. **One line per interface —
this is a seam map, not an interface design.**

The distinction matters. The last attempt designed interfaces up front — `conversation/
contract.ts` (405 lines), `memory/contract.ts` (227), plus worker and evals — and those
files are exactly where the rot accumulated, because behaviour got bolted onto contracts
written before anyone had called them. Detailed interfaces are designed for the area about
to be built, and no further.

Revisable. Expected to change on contact.

---

## The modules

| Module | Owns | Interface is about | Effect |
|---|---|---|---|
| `cli` | Command wiring only. **No logic.** | `init` · `doctor` · `chat add` · `agent add` | no |
| `home` | The home on disk: layout, validation, health, scaffolding, change hints. **The only thing that knows a path.** | designed — [ADR 001](../adr/001-home-interface.md). `openHome(root, deps)` → unit handles; read · plan · converge | no |
| `blobs` | Content-addressed binary store. Dedup by hash. | put · get · exists, all by hash | no |
| `channel` | A source of messages and a bound destination. Accounts, source modes, allowlist, cursors. **Hides `whatsappd` entirely.** | sync a source → transcript entries + blob refs; send, pre-bound to one chat | no |
| `media` | Interpreting a blob: speech-to-text, vision, extraction. Keyed by hash, cached. | `process(ref) → Interpretation` | later |
| `knowledge` | The OpenKnowledge project and the ontology. **Hides the OK MCP client.** Frontmatter validation, the work queue, the derived index. | read · search · write · validate · next · index | no |
| `harness` | Constructing and running **one** agent session: cwd, model policy, MCP list, skills, receipt. **Hides Pi entirely.** | `run(spec) → Receipt` | no |
| `work` | Durable work: triggers, due times, leases, claims, retry, jobs. **Decides when and what runs.** | designed, **provisional** — [ADR 002](../adr/002-work-interface.md). notify · drain · parked; loops are declarations. `claim · complete · fail · nextDue` was rejected — see the ADR | **yes** |
| `capabilities` | Resolving a chat's config into a concrete MCP server list and the background agents it may reach. The reflector that exposes agents as MCP tools. | `resolve(chat) → SessionCapabilities` | no |
| `speaker` | The mouth. Compose a turn, decide whether to speak, send. | `turn(chat, incoming) → Receipt` | no |
| `evals` | Cases as directories, offline replay, deterministic assertions. | `run(cases) → Report` | no |

## Dependency direction

```
cli ─────────────> home

composition root ─> everything (the ONLY place wiring happens)

work ────────────> harness ──┬─> knowledge
                             ├─> capabilities
                             └─> home
channel ─────────> blobs
media ───────────> blobs, knowledge
speaker ─────────> harness, channel (send, pre-bound)
evals ───────────> harness (replay)
```

Rules the graph encodes:

- **Nothing depends on `cli`.** It is a leaf.
- **`home` and `blobs` depend on nothing.** They are the floor.
- **`harness` runs a session; `work` decides that a session should run.** Two seams, not
  one. Conflating them is what produced four drifted copies last time.
- **Only the composition root wires.** No module resolves its own dependencies.

## Two seams worth designing twice

`DESIGN-IT-TWICE` (from the `codebase-design` skill) is expensive, so it is spent only
where an interface is written through by many callers *and* hard to change later.

**`home`** — every area writes through it. The obvious version came out shallow last time:
nine files, eleven exported functions, twelve interfaces, all over file reading, and every
caller learned the layout. **Done — [ADR 001](../adr/001-home-interface.md).**

**`work`** — the old repo failed here four separate times, 1722 lines of drifted
duplicates. The prior evidence is unusually strong, so designing it before we have felt the
loops is justified. **Mark the result provisional. Done — [ADR 002](../adr/002-work-interface.md),
provisional.**

Everything else: sketch now, design when built.

## Provisional / uncertain

- **`capabilities`** may not be a module. It has one adapter today, which by the skill's own
  rule is a hypothetical seam. It may collapse into `harness`. Revisit when a second chat
  configuration actually exists.
- **`blobs`** may collapse into `channel` if `whatsappd`'s own hash-addressed media
  directory turns out to be sufficient as-is.
- **`media`** and **`knowledge`** may want a shared notion of "a document produced from
  evidence". Do not extract it until both exist.
