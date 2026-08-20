# OpenKnowledge is vendored, not called

## The rule

**We match OpenKnowledge's format. We never call its CLI.** `ambient init` writes
`knowledge/.ok/config.yml`, `knowledge/.ok/.gitignore` and `knowledge/.okignore` from
`home`'s own templates. No code in this repository spawns `ok`, and `home` has no ports
at all.

At runtime the knowledge base is addressed over **MCP**, never by path, and never
through OK's internals.

## Why

**`ok init` does four things and we want one of them.** Verified by running it: it
writes `.ok/config.yml` — and also creates a nested `.git`, editor wiring under
`.claude`, `.codex`, `.cursor`, `.github`, `.opencode` and `.pi`, and housekeeping
files. `--no-skills` suppresses only *user-global* skill bundles; the project
projections are written anyway, so no flag combination avoids it.

**The one file we want is entirely comments** — every key in `.ok/config.yml` is a
default. So the whole of the dependency buys a file we can write from a template, and
charges a nested repository and six directories of editor pollution inside an Ambient
home for it.

**The layout is the thing worth taking; the tooling is not.** The result opens in the
OpenKnowledge app because the format matches, and it costs no CLI dependency. A UI of
our own replaces the app later; the format survives that.

**Depend on OK's tool surface, never on its internals.** Skills are first-class OK
objects addressed by name and scope: `write` creates a Draft and `install` is the review
gate that projects it into `.claude/`, `.pi/` and the rest. Writing into those
projections by path re-implements what OK owns and bypasses the gate — which is why
`ambient skill add` does not exist.

## The check

`vp test` — `home.test.ts`, *"init writes the OpenKnowledge scaffold itself, and spawns
nothing"*, asserts the scaffold is exactly `.ok/` and `.okignore`, and that
`.ok/config.yml` carries OpenKnowledge's schema comment. `home` taking no ports is
visible in `openHome(root)`'s signature.

That no future module shells out to `ok` is **not currently checked**.

## Amendments

### 1 · 2026-08-20 — the runtime clause is withdrawn

**"At runtime the knowledge base is addressed over MCP, never by path" is withdrawn by
[ADR 007](../adr/007-knowledge-is-files-not-a-client.md).**

That clause and *"no code in this repository spawns `ok`"* were written as alternatives and
are not. **Addressing the knowledge base over MCP is what spawns `ok`** — measured, not
argued: an agent's first MCP call carrying `cwd: ~/.ambient/knowledge` caused `ok start`,
which wrote a `.git/ok/` store and eleven files under `.ok/local/` into the principal's real
home. The rule's own reason for avoiding `ok init` — that it creates a nested `.git` — was
reproduced by the path the rule prescribes.

*Instrument: `/Users/abuusama/.ok/logs/cli.2026-08-20.log:6`. Cleaned up; `knowledge/` is
`[.ok, .okignore]` again and `doctor` exits 0.*

**Everything else in this rule stands, and is stronger for it.** We still match the format.
We still never call the CLI. `home` still writes the scaffold from its own templates and
takes no ports. What replaces the withdrawn clause is simpler: `knowledge` reads and writes
the files, reaching them through a `Place` from `home` like every other module.

The final section's discipline — *"depend on OK's tool surface, never on its internals"* —
is superseded by a stricter one: **depend on the format, never on the tool surface.**
`ambient skill add` still does not exist, but no longer for the reason given there: a skill
written by plain `cat` is adopted as fully managed, so writing by path bypasses no gate,
because there is no gate. See
[`findings/02`](../planning/knowledge/findings/02-ok-skills-draft-and-install.md).
