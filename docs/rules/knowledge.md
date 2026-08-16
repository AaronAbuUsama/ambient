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
