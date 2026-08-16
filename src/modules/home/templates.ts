/**
 * What `init`, `chat add` and `agent add` write. String constants inside the
 * implementation — not a `templates/` directory, and not in the interface.
 */

export const IDENTITY = `# Ambient

One entity, many conversations. This file is who Ambient is, everywhere.

It is prepended to every session in every chat. A chat's \`mandate.md\` **adds** to
this; it never replaces it. Edit freely — it is live on the next turn.

## Standing

- Say what is true, including when the answer is "I do not know yet".
- Never speak into a conversation that is not in a source's \`allow\` list.
- Record what was decided, not what was said.
`;

export const CONFIG = `# The global configuration. \`ambient doctor\` validates every key here.

sources: # name -> source. Nothing is read or spoken to unless \`allow\` lists it.
  personal:
    kind: whatsapp
    mode: ingest # ingest never speaks
    allow: []
  ambient:
    kind: whatsapp
    mode: speak
    allow: []

mcp: # server definitions, global. Referenced by name per chat and per agent.
  openknowledge:
    command: ok
    args: [mcp]
    env: {}

models: # provider definitions
  fast:
    provider: openai-compatible
    baseUrl: http://127.0.0.1:8317/v1
    model: gpt-5.6-lunar
    thinking: "off"
  careful:
    provider: openai-compatible
    baseUrl: http://127.0.0.1:8317/v1
    model: gpt-5.6-lunar
    thinking: high

roles: # role -> a key in \`models\`
  default: fast
  speaker: fast
  digest: careful
  media: fast
  synthesis: careful
`;

export const SCHEMA = `# The ontology. Add types freely; the field forms are closed:
#
#   text · text[] · ref · ref[] · date · enum(a|b|c)      a trailing ? marks optional
#
# \`ambient doctor\` rejects anything else, which is what keeps per-install
# extension from becoming a plugin system.

Person:
  name: text
  aliases: text[]
  numbers: text[]
  org: ref?
  role: text?
  status: enum(unreviewed|reviewed)
  source: enum(history|witnessed)

Organization:
  name: text
  aliases: text[]
  domain: text?
  role: text?
  status: enum(unreviewed|reviewed)
  source: enum(history|witnessed)

Commitment:
  what: text
  who: ref
  due: date?
  source_message: text
  status: enum(open|done|dropped)

Issue:
  title: text
  platform: text
  repo: text?
  number: text?
  status: enum(open|closed)

Media:
  hash: text
  kind: enum(image|voice|audio|video|document)
  from: ref?
  chat: ref?
  duration: text?
  status: enum(unprocessed|processed|failed)
  processed_by: text?

Chat:
  name: text
  participants: ref[]
  purpose: text?
  mode: enum(ingest|speak)
`;

/** Configuration is files in a git repo. These three must stay out of it. */
export const GITIGNORE = `blobs/
state.db
knowledge/.ok/
`;

export const CHAT_CONFIG = `# The machine half of this chat's mandate. \`mandate.md\` beside it is the prose half.

source: personal # must resolve in the global config.yaml \`sources\`
peer: "" # the source's own id for this conversation
tools: []
mcp: [openknowledge] # must resolve in the global config.yaml \`mcp\`
agents: [] # must resolve under agents/
`;

export const MANDATE = (slug: string): string => `# ${slug}

The prose half of this chat's mandate. It **adds** to \`identity.md\`; it never
replaces it.

## Who this is

Unfilled.

## What Ambient does here

Unfilled.

## What Ambient does not do here

Unfilled.
`;

export const AGENT_CONFIG = `model: careful # must resolve in the global config.yaml \`models\`
thinking: high
mcp: [openknowledge] # must resolve in the global config.yaml \`mcp\`
scope: Unfilled — one bounded objective, and what this agent declines.
`;

export const SKILL = (name: string): string => `# ${name}

One bounded objective. Say plainly what this agent does, what it needs, and
what it refuses.

## Does

Unfilled.

## Refuses

Unfilled.
`;
