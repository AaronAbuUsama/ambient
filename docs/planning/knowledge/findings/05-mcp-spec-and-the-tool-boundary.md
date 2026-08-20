# KNOWLEDGE · R5 — What the MCP spec changed, and where "tool" stops and "MCP server" starts

**Question.** What changed in the Model Context Protocol specification, and where does the
line fall between a "tool" and an "MCP server" in a system like Ambient?

**Why it was asked.** The roadmap has carried it since design phase —
`docs/design/roadmap.md:160`: *"What did the MCP spec change? — Statelessness; better with
many agents on many servers. **Read the spec — do not design from memory.**"* The
principal's framing: *"we'll be implementing both tools, regular tools and MCPs, and MCPs
are generally for user-added tools so we can extend the system. Because MCP has got a new
spec anyway, it's stateless now."*

**The instruction was the right one.** The current revision is **`2026-07-28`**, released
after this model's training cutoff. Everything anyone in this project "remembers" about MCP
— the `initialize` handshake, `Mcp-Session-Id`, the GET stream, servers sending `roots/list`
as their own JSON-RPC request — describes a protocol era the spec now calls **legacy**.
Answering from memory would have produced a design against a superseded protocol.

**Sources.** `modelcontextprotocol.io` spec pages under `/specification/2026-07-28/` and the
changelogs of `2025-11-25`, `2025-06-18` and `2025-03-26`; the normative TypeScript schema
`schema/2026-07-28/schema.ts` (98,426 bytes, fetched from the `modelcontextprotocol`
repository and read locally); and OpenKnowledge 0.55.2's shipped CLI bundle at
`/Applications/OpenKnowledge.app/Contents/Resources/cli/dist/`, read only, never written and
never executed beyond `ok --version`.

**[read]** = asserted by the cited spec page or schema line. **[measured]** = I ran it or
computed it here. **[inference]** = mine, asserted by no source. Every protocol claim names
its revision; a claim about "MCP" without one is worthless in this document, because the
whole question is what changed between revisions.

---

## Verdicts

| # | Sub-question | Verdict |
|---|---|---|
| 1 | The revisions | **Five, and the current one is `2026-07-28`.** `2024-11-05` → `2025-03-26` → `2025-06-18` → `2025-11-25` → **`2026-07-28`**. The identifier is a date and it means *the last date a backwards-incompatible change was made* — so the gap from `2025-11-25` is not eleven months of drift, it is one breaking release. `LATEST_PROTOCOL_VERSION = "2026-07-28"` in the schema. |
| 2 | Statelessness | **Both levels, and the protocol level is the larger half — the opposite of the expected error.** Transport: `Mcp-Session-Id`, the GET stream and `Last-Event-ID` resumability are all gone from Streamable HTTP. Protocol: **`initialize` and `notifications/initialized` are deleted outright.** Zero occurrences of `InitializeRequest`, `PingRequest`, `SetLevelRequest`, `SubscribeRequest` or `SessionId` remain in the schema. Every request now carries its own version and capabilities in `_meta`. A stdio process is explicitly **not** a session. |
| 3 | What else changed | **Four things that reach the design.** (a) **MRTR** — servers may no longer send requests at all; `roots/list`, `sampling/createMessage` and `elicitation/create` now come back *inside a result* and the client **retries the whole call**. (b) `subscriptions/listen` replaces the GET endpoint and `resources/subscribe`. (c) **Roots, Sampling and Logging are all Deprecated** as of `2026-07-28`, earliest removal 2027-07-28. (d) Results carry a required `resultType`, and list results carry required `ttlMs` + `cacheScope`. |
| 4 | Tool vs MCP server | **The spec is silent, and that silence is the finding.** MCP defines a wire protocol between two processes; it has no concept of an in-process tool and takes no position on which of your capabilities should be one. The principal's split therefore cannot be wrong *on the spec* — but `2026-07-28` changes the price list underneath it: statelessness removes the per-session handshake cost, and `ttlMs`/`cacheScope`/deterministic ordering make a server's tool list cacheable. What MCP still costs is a process, a serialization boundary and a schema round-trip. What it still buys is isolation, language independence and third-party extension. |
| 5 | Hot-reload | **Supported, and the mechanism changed in this revision.** `tools.listChanged` + a long-lived `subscriptions/listen` with `toolsListChanged: true`; the server then emits `notifications/tools/list_changed` and the client re-reads `tools/list`. Under `2025-11-25` the notification arrived unsolicited; under `2026-07-28` **the server MUST NOT send it unless the client opened a stream and asked for that exact type.** Separately, restarting a stdio server mid-flight is now an explicitly supported recovery, because there is no session to lose. |
| — | OpenKnowledge, measured | **A legacy-era server.** `ok mcp` runs the `initialize` handshake (`server.oninitialized`), calls `listRoots()`, and holds **sticky per-session project state**. Its three routing mechanisms are: an explicit `cwd` tool argument, that sticky value, and a single advertised root. All three are things `2026-07-28` either deprecates or forbids. |

---

## 1 — The revisions, in order

**[read]** `/specification/versioning`:

> The Model Context Protocol uses string-based version identifiers following the format
> `YYYY-MM-DD`, to indicate the last date backwards incompatible changes were made.

and:

> The **current** protocol version is [**2026-07-28**](https://modelcontextprotocol.io/specification/2026-07-28/).

The chain, each link read off the changelog page of the later revision, which names the
revision it compares against **[read]**:

| Revision | State | Compared against | What it did that still matters |
|---|---|---|---|
| `2024-11-05` | Final | — | The original. HTTP+SSE transport. |
| `2025-03-26` | Final | `2024-11-05` | Replaced HTTP+SSE with **Streamable HTTP**; OAuth 2.1 authorization framework; added JSON-RPC batching; tool annotations. |
| `2025-06-18` | Final | `2025-03-26` | **Removed** JSON-RPC batching; added **elicitation**; structured tool output; servers classified as OAuth Resource Servers; `MCP-Protocol-Version` header required on HTTP. |
| `2025-11-25` | Final | `2025-06-18` | Icons; URL-mode elicitation; tool calling inside sampling; **experimental tasks**; OAuth Client ID Metadata Documents. |
| **`2026-07-28`** | **Current** | `2025-11-25` | Everything in §2 and §3 below. |

**[measured]** The schema is the tie-breaker where prose could disagree, and it agrees —
`schema/2026-07-28/schema.ts:30`:

```ts
export const LATEST_PROTOCOL_VERSION = "2026-07-28";
```

**[read]** The spec now also runs a formal **feature lifecycle** — Active / Deprecated /
Removed, a minimum twelve-month deprecation window, and a
[deprecated features registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
(SEP-2596). This is new in `2026-07-28` and it is the reason §3's deprecations come with
dates rather than vibes.

---

## 2 — Statelessness: what state died, and at which level

The brief warned that conflating transport-level and session-level statelessness is the
likely error. It is a real distinction and both moved — but the important half is the one
that is easy to miss, because the transport change is the visible one and the protocol
change is the structural one.

### The protocol level: the handshake is gone

**[read]** `/specification/2026-07-28/changelog`, Major changes #2:

> Make MCP stateless: remove the `initialize`/`notifications/initialized` handshake. Every
> request now carries its protocol version and client capabilities in `_meta`
> (`io.modelcontextprotocol/protocolVersion`, `io.modelcontextprotocol/clientCapabilities`).

**[read]** `/specification/2026-07-28/basic/index`, the *Statelessness* section, is the
normative statement and it is unusually blunt:

> The Model Context Protocol (MCP) is a **stateless protocol**: all the information needed
> to process a request is contained in the request itself. A server processes each request
> independently; no state should be inferred from previous requests, even those on the same
> connection or stream.

with four requirements under it **[read]**:

- Servers **MUST NOT** rely on prior requests over the same connection to establish context.
- Servers **SHOULD NOT** require that a client reuse the same connection or process for
  related operations.
- Clients **SHOULD NOT** use an individual task, thread, or conversation as the lifetime
  boundary for the stdio process.
- State spanning requests **MUST** be referenced by an explicit identifier the client passes
  on each request.

and a note that settles the question directly for a stdio host **[read]**:

> This implies that an open connection, such as a STDIO process, is not a conversation or
> session: clients may interleave unrelated requests on the same transport, and a server
> must not treat connection or process identity as a proxy for conversation or session
> continuity.

### What used to be per-connection state, and where it went

**[measured]** — count of each identifier in `schema/2026-07-28/schema.ts`:

| Type | Occurrences | Was |
|---|---|---|
| `InitializeRequest` | **0** | the handshake, `2024-11-05`–`2025-11-25` |
| `InitializedNotification` | **0** | its completion signal |
| `PingRequest` | **0** | liveness, all prior revisions |
| `SetLevelRequest` | **0** | `logging/setLevel`, connection-scoped log level |
| `SubscribeRequest` / `UnsubscribeRequest` | **0** / **0** | `resources/subscribe` |
| `RootsListChangedNotification` | **0** | `notifications/roots/list_changed` |
| `SessionId` | **0** | `Mcp-Session-Id` |

Every one of them is gone. Not deprecated — absent from the source of truth.

| State the old protocol held | Held where | `2026-07-28` replacement **[read]** |
|---|---|---|
| Protocol version | negotiated once at `initialize` | `_meta.io.modelcontextprotocol/protocolVersion`, **required on every request** |
| Client capabilities | sent once at `initialize` | `_meta.io.modelcontextprotocol/clientCapabilities`, **required on every request** |
| Client identity | `clientInfo` at `initialize` | `_meta.io.modelcontextprotocol/clientInfo`, SHOULD be on every request |
| Server identity | `serverInfo` at `initialize` | `_meta.io.modelcontextprotocol/serverInfo` in each *result* |
| Log level | `logging/setLevel`, connection-wide | `_meta.io.modelcontextprotocol/logLevel`, **per request** |
| HTTP session | `Mcp-Session-Id` header | **nothing.** Removed. |
| Resource subscriptions | `resources/subscribe` + GET stream | `subscriptions/listen`, scoped to *the request*, not the connection |
| Anything else | implicit, per-connection | an **explicit server-minted handle passed as an ordinary tool argument** |

**[read]** A request missing a required `_meta` field is malformed and the server **MUST**
reject it with `-32602`; on HTTP the status **MUST** be `400 Bad Request`
(`/specification/2026-07-28/basic/index`).

### The transport level: three mechanisms deleted

**[read]** `/specification/2026-07-28/basic/transports/streamable-http` — the revision banner
says exactly two things changed: *"Removal of the GET stream endpoint"* and *"Removal of
protocol-level sessions."* Its **Earlier Streamable HTTP Revisions** section enumerates what
a `2026-07-28`-only server must now refuse:

> Protocol versions `2025-03-26` through `2025-11-25` also used the Streamable HTTP
> transport, but in a different shape: servers could assign a session via the
> `Mcp-Session-Id` header (terminated with HTTP DELETE), clients could open a standalone SSE
> stream with HTTP GET to receive server-initiated messages, servers could send JSON-RPC
> *requests* on SSE streams, and streams were resumable via `Last-Event-ID`. **None of these
> mechanisms are part of this revision.**

and prescribes the handling — GET/DELETE → `405`; `Mcp-Session-Id` → ignore, do not mint or
echo; `Last-Event-ID` → ignore **[read]**. Flatly: *"Resumable SSE streams via
`Last-Event-ID` are not supported."*

**[read]** Changelog Major changes #9 states the consequence rather than hiding it:

> A broken response stream loses the in-flight request; clients **MUST** re-issue it as a
> new request with a new request ID.

### So the two levels are not the same thing, and both moved

**[inference]** The clean statement of the distinction, for this repo's purposes:

- **Transport-level statelessness** is about whether the *connection* carries identity —
  answered by deleting `Mcp-Session-Id`, the GET stream and resumability. It affects HTTP
  servers behind load balancers.
- **Protocol-level statelessness** is about whether a *request* is self-describing —
  answered by deleting `initialize` and moving version, capabilities and identity into
  `_meta` on every request. It affects **everyone, stdio included.**

The framing on the roadmap — *"statelessness; better with many agents on many servers"* — is
correct, and the spec says why in its own words. **[read]**
`/specification/2026-07-28/basic/patterns/mrtr`: the MRTR pattern exists to handle
server-initiated requests

> without requiring a shared storage layer across server instances or requiring stateful
> load balancing.

**[inference]** What that buys an operator running many agents against many servers: any
request can be answered by any replica; a crashed server loses in-flight work and nothing
else; a client can fan N sessions at one server process without N handshakes; and a stdio
process can be shared across unrelated conversations, because the spec now says a process is
not a conversation. The cost is that every request is fatter — version and capabilities ride
on all of them — and that a server needing continuity must mint and validate its own
handles, including the replay defences MRTR spells out in §3.

---

## 3 — What else changed, for a host that builds sessions with a per-session server list

### 3.1 MRTR — servers can no longer send requests. Breaking.

This is the change most likely to break an assumption someone in this repo already holds.
**[read]** `/specification/2026-07-28/basic/patterns/mrtr`, first note:

> Servers **MUST** send server-to-client requests (such as `roots/list`,
> `sampling/createMessage`, or `elicitation/create`) using the MRTR pattern. The previous
> pattern of server-initiated requests is no longer supported. **This is a breaking change.**

The mechanism **[read]**: the server answers the client's call with
`resultType: "input_required"` and an `InputRequiredResult` — `schema.ts:584-595`:

```ts
export interface InputRequiredResult extends Result {
  inputRequests?: InputRequests;
  requestState?: string;
}
```

The client fulfils each `inputRequests` entry and **retries the original request** with
`inputResponses` and the opaque `requestState` echoed back verbatim. The retry **MUST** use
a different JSON-RPC id — they are independent requests **[read]**.

Only three client requests may receive one **[read]**: `prompts/get`, `resources/read`,
`tools/call`. Servers **MUST NOT** send an `InputRequiredResult` on anything else, and
**MUST NOT** include an input request type the client has not declared in
`clientCapabilities`.

**[read]** `requestState` is the server's own state, round-tripped through an untrusted
client. The spec requires servers to treat it as attacker-controlled, integrity-protect it
(HMAC/AEAD) where it influences authorization, and bind principal + TTL + originating-request
digest inside it to bound replay.

**[inference]** For a host: an MCP call is no longer a single request/response you can model
as a function call with a timeout. It is a small loop, and the loop can repeat — the spec
explicitly permits a server to return `InputRequiredResult` on multiple attempts at the same
request. Anything wrapping MCP calls needs a retry budget, not just a timeout.

### 3.2 `subscriptions/listen` replaces the GET endpoint and `resources/subscribe`

**[read]** `/specification/2026-07-28/basic/patterns/subscriptions`. The client opens one
long-lived request naming exactly the notification types it wants — `schema.ts:1270-1288`:

```ts
export interface SubscriptionFilter {
  toolsListChanged?: boolean;
  promptsListChanged?: boolean;
  resourcesListChanged?: boolean;
  resourceSubscriptions?: string[];   // "Replaces the former `resources/subscribe` RPC."
}
```

The server **MUST NOT** send notification types the client has not explicitly requested; it
**MUST** acknowledge first with `notifications/subscriptions/acknowledged`, and the
acknowledgment reflects the subset it agreed to honour **[read]**. Every notification on the
stream carries `io.modelcontextprotocol/subscriptionId` in `_meta` — on stdio, where all
subscriptions share one channel, clients **MUST** use it to demultiplex **[read]**.

**[read]** And, consistent with §2: *"On **stdio**, if the connection is terminated and then
re-established, the client **MUST** re-send `subscriptions/listen` — the server holds no
subscription state across reconnections."*

### 3.3 Roots, Sampling and Logging are Deprecated

**[read]** The registry at `/specification/2026-07-28/deprecated`:

| Feature | Deprecated in | Migration path | Earliest removal |
|---|---|---|---|
| **Roots** | `2026-07-28` | *"Pass directories or files via tool parameters, resource URIs, or server configuration"* | first revision on or after **2027-07-28** |
| **Sampling** | `2026-07-28` | integrate directly with LLM provider APIs | 2027-07-28 |
| **Logging** | `2026-07-28` | `stderr` on stdio; OpenTelemetry for observability | 2027-07-28 |
| Dynamic Client Registration | `2026-07-28` | Client ID Metadata Documents | 2027-07-28 |
| `includeContext: "thisServer"`/`"allServers"` | `2025-11-25` | omit, or `"none"` | follows Sampling |
| HTTP+SSE transport | `2025-03-26` | Streamable HTTP | three months after SEP-2596 Final |

**Roots matters here**, because a previous agent measured OpenKnowledge routing on it. The
`2026-07-28` roots page carries a deprecation warning at the top **[read]**: *"New
implementations **SHOULD NOT** adopt it; existing implementations **SHOULD** migrate to
passing directories or files via tool parameters, resource URIs, or server configuration."*
Roots is doubly affected — deprecated *and* reshaped, because `roots/list` now only arrives
as an MRTR `inputRequests` entry, and `notifications/roots/list_changed` is deleted outright
**[measured: 0 occurrences in `schema.ts`]**.

**[read]** The `2026-07-28` roots page also states what roots never was:

> They are informational guidance rather than an access-control mechanism. The protocol does
> not enforce that servers stay within roots.

**Elicitation is not deprecated** and survives, reshaped through MRTR. `2026-07-28` removes
`notifications/elicitation/complete` and the `elicitationId` field that `2025-11-25` had
introduced for URL-mode elicitation, because under MRTR the client learns the outcome by
retrying **[read]**. **Sampling is deprecated**, so a design in which a server asks Ambient's
model to generate something is building on a feature with a stated removal window.

### 3.4 `server/discover`, `resultType`, caching, authorization

**[read]** `server/discover` is a **mandatory** RPC — *"Servers **MUST** implement it"* —
returning `supportedVersions`, `capabilities`, `serverInfo` and optional `instructions` in
one request, with no prior state. Calling it is optional for clients. Its second job is the
stdio backward-compatibility probe (§3.5).

**[read]** Every result now carries a required `resultType`: `"complete"` or
`"input_required"`. Clients **MUST** treat an absent `resultType` from an earlier-protocol
server as `"complete"`.

**[read]** `tools/list`, `prompts/list`, `resources/list`, `resources/read` and
`resources/templates/list` now return a `CacheableResult` — `schema.ts:1081-1094` — with
**required** `ttlMs` (freshness hint, ms) and `cacheScope` (`"public"` | `"private"`).
`server/discover` is cacheable too. And **[read]** servers **SHOULD** return tools from
`tools/list` in a deterministic order, explicitly *"to enable client-side caching and improve
LLM prompt cache hit rates."*

**[read]** Authorization, stdio-relevant summary: `/specification/2026-07-28/basic/index`
says HTTP implementations **SHOULD** conform to the authorization framework, whereas *"STDIO
transport **SHOULD NOT** follow this specification, and instead retrieve credentials from the
environment."* For HTTP, `2026-07-28` adds RFC 9207 `iss` validation, requires
`application_type` in Dynamic Client Registration, requires clients to key persisted
credentials by issuer, and **deprecates DCR itself** in favour of Client ID Metadata
Documents.

**[read]** Error codes were renumbered into a policy-partitioned range: `-32020`
`HeaderMismatch`, `-32021` `MissingRequiredClientCapability`, `-32022`
`UnsupportedProtocolVersion` (`schema.ts:450`). `-32002` (resource not found) is replaced by
`-32602` and **MUST NOT** be emitted by `2026-07-28` implementations, though clients SHOULD
still accept it from older servers.

### 3.5 The compatibility story, because every server we have today is legacy

**[read]** `/specification/2026-07-28/basic/versioning` names the eras: **Modern** =
per-request metadata (`2026-07-28`+), **Legacy** = `initialize` handshake (`2025-11-25` and
earlier), **Dual-era** = both. Its compatibility matrix has one row that decides Ambient's
near-term posture:

| Client | Server | Outcome **[read]** |
|---|---|---|
| Modern | **Legacy** | **Fails.** *"The server may reject the request with an implementation-defined error, stay silent, or even process an era-ambiguous method under legacy semantics."* |
| **Dual-era** | Legacy | **Works.** stdio: the probe errors or times out, client falls back to `initialize`. |
| Dual-era | Modern | Works. |

**[read]** The stdio probe, from
`/specification/2026-07-28/basic/transports/stdio#backward-compatibility`: send
`server/discover` first. A `DiscoverResult` or a recognized modern error means modern — *"Do
**not** fall back to `initialize`."* Any other error, or a timeout, means legacy. The
fallback **MUST NOT** be keyed to one specific error code. Era is a property of the server,
and clients **SHOULD** cache the determination for the lifetime of the process and **MAY**
persist it across restarts.

**[read]** Probing is **RECOMMENDED even for a modern-only client**, because *"some legacy
servers do not validate that a request arrives after `initialize` and would process an
era-ambiguous method (such as `tools/call`) under legacy semantics. Probing yields a
deterministic failure instead."*

---

## 4 — Tool vs MCP server: the spec is silent, and that is the answer

### The spec takes no position, and cannot

**[read]** MCP defines JSON-RPC 2.0 messages between a client and a server across stdio or
Streamable HTTP. There is no `Tool` that is not exposed by a server, no notion of an
in-process capability, and no guidance anywhere in `2026-07-28` about which of a host's
capabilities ought to be in-process versus behind the protocol. **The line the principal is
drawing is an architecture decision the specification neither endorses nor forbids.**

**[inference]** So sub-question 4 cannot be settled "against the spec". What the spec can
do — and does — is tell us what each side of the line costs, and `2026-07-28` moved several
of those numbers.

### What `2026-07-28` made cheaper

| Cost, under `2025-11-25` **[read]** | Under `2026-07-28` **[read]** |
|---|---|
| Every new connection pays an `initialize` round-trip before any useful call | **No handshake.** First request is a real request. `server/discover` is optional for a modern-only client. |
| A session is pinned to a connection; N chats attaching to one server needs N sessions or shared state | A process is **explicitly not a session**; unrelated requests may interleave on one transport |
| `tools/list` could vary per-connection | List endpoints **MUST NOT** vary per-connection; ordering SHOULD be deterministic; result carries `ttlMs` + `cacheScope` → **the tool list is cacheable across sessions** |
| A dropped stream could be resumed (`Last-Event-ID`) | No resumption — but a crashed stdio server is now a *supported* recovery: *"any in-flight requests are simply lost and the client can retry them against the fresh process"* |

**[inference]** For a host that constructs one agent session per chat against a per-chat
server list, this is a material improvement: the same server process can back many chats, and
its tool list can be fetched once and cached under the server's own `ttlMs` rather than
re-listed per session.

### What MCP still costs that an in-process call does not

**[inference]**, reasoned from the mechanics read above — none of this is asserted by the
spec, which does not discuss the comparison:

- **A process.** stdio means spawn, stderr plumbing, and a shutdown protocol (close stdin,
  wait, escalate to SIGTERM/SIGKILL) **[read: stdio page]**.
- **Serialization.** Arguments and results cross a newline-delimited JSON boundary. Binary is
  base64 in content blocks.
- **A schema round-trip.** Every tool is described by a JSON Schema 2020-12 document the
  client must fetch, may cache, and — per `2026-07-28` — must validate for `$ref` safety and
  composition-keyword resource bounds **[read]**. An in-process function has its types at
  compile time.
- **Latency.** At minimum one process boundary per call; with MRTR in play, potentially
  several full round-trips for one logical call.
- **New failure modes.** The server dies mid-call; version mismatch (`-32022`); a missing
  capability (`-32021`); a tool list that changed under a cache TTL; an `InputRequiredResult`
  loop that does not terminate.

### What it buys

**[inference]**, with the spec support noted:

- **Isolation** — a crashing or hanging extension is a child process, not the daemon. The
  spec now blesses restarting it: in-flight requests are lost, nothing else is **[read]**.
- **Language independence** — the boundary is JSON-RPC over a byte stream.
- **Third-party extension** — a stranger's server works if it speaks the protocol. This is
  the whole of the principal's *"MCPs are generally for user-added tools"*, and nothing in
  the spec argues against it.
- **Hot-reload without restart** — §5, and this is the one that is load-bearing for Ambient.
- **Per-chat granting is a list of names** — because a server is an addressable thing, a
  chat's grant can be `mcp: [openknowledge]` rather than a code path.

### The spec's one nod in this direction

**[read]** `/specification/2026-07-28/server/tools` has a section headed **Stateful Tools**,
flagged non-normative, that is worth quoting because it is exactly the shape the principal
described for the background-agent reflector:

> MCP has no protocol-level session, so a server cannot rely on implicit per-connection state
> to relate one tool call to the next. Servers that need to maintain state across calls […]
> should do so by returning an explicit handle from a creation tool and accepting that handle
> as an argument on subsequent calls.

with a note that *"from the wire's perspective a handle is an ordinary string in a tool result
and an ordinary argument to subsequent tool calls"*, and four design constraints: validate
authorization against the handle **on every call**; keep handles opaque; state the retention
policy **in the creation tool's description** so the model can see it; and return a *tool
execution error* (not a protocol error) on an expired handle so the model can recover.

**[inference]** `linear__dispatch(objective) → job handle`, then a later call polling that
handle, is precisely this pattern — and `2026-07-28` has now written down how to do it and
what a correct implementation must check. That is a gift to the reflector design, not an
obstacle. Note also that the redesigned **Tasks** extension (`io.modelcontextprotocol/tasks`,
moved out of core in `2026-07-28`, polling via `tasks/get`, `tasks/update` for client input,
`tasks/list` removed) is the standardised version of the same idea and may be worth reading
before hand-rolling one **[read: changelog Major changes #6]**.

### One collision the spec names, that a per-chat server list will hit

**[read]** `/specification/2026-07-28/server/tools`:

> Tool name uniqueness is scoped to a single server. Clients or proxies that aggregate tools
> from multiple servers **MAY** encounter naming collisions (for example, two servers each
> exposing a `search` tool) and **SHOULD** implement a disambiguation strategy such as
> prefixing tool names with a server identifier. The server `name` (from `serverInfo`) is
> **not guaranteed to be unique** across servers and **SHOULD NOT** be relied upon for
> disambiguation.

**[inference]** Ambient's config already supplies a unique local key — `openknowledge` in the
`mcp:` map — which is a better disambiguator than `serverInfo.name` for exactly the reason
the spec gives. Whether Pi does this prefixing, or Ambient must, is unmeasured here and
belongs to the open Pi question on the roadmap.

---

## 5 — Hot-reload: supported, and it costs a long-lived request

Ambient has settled that adding a capability never restarts the daemon
(`docs/design/product.md`, *Mandate — two halves*). Two separate questions: can a **server's
tool list** change mid-session, and can **the chat's server list** change.

### A server's tools changing mid-session: yes, opt-in

**[read]** `/specification/2026-07-28/server/tools` — the server declares
`tools: { listChanged: true }`, and then:

> When the list of available tools changes, servers that declared the `listChanged`
> capability **SHOULD** send a notification to clients that **have opened a
> `subscriptions/listen` stream with `toolsListChanged: true`**.

**[read]** `schema.ts:1888` states the constraint on the notification itself:

> This is only delivered on a `subscriptions/listen` stream when the client requested it via
> the `toolsListChanged` filter field.

**This is the change from `2025-11-25`.** Under the previous revision a server could push
`notifications/tools/list_changed` unsolicited on the standalone GET stream. Under
`2026-07-28` the GET stream does not exist and the server **MUST NOT** send notification types
the client did not ask for **[read]**. So a host that wants to notice tool changes must hold
one open `subscriptions/listen` request per server it cares about, for as long as it cares —
and on stdio must re-issue it after any process restart **[read]**.

**[read]** The second mechanism is polling with a server-supplied budget: `ttlMs` on the
`tools/list` result is *"a freshness hint […] allowing clients to cache responses and reduce
polling"*, and the changelog says both fields *"complement existing `listChanged`
notifications."* A host that does not want a long-lived stream per server can re-list on
`ttlMs` expiry instead.

### The chat's server list changing: outside the protocol

**[inference]** Adding `mcp: [openknowledge, linear]` to a chat's config is Ambient's own
concern — MCP has nothing to say about how a client decides which servers to attach to. The
spec's contribution is negative and helpful: because there is no handshake and no session,
attaching a newly-declared server mid-session costs one process spawn and a first request,
and detaching one costs closing stdin. Nothing has to be torn down and rebuilt.

### And the restart escape hatch is now legitimate

**[read]** `/specification/2026-07-28/basic/transports/stdio`, *Unexpected Termination*:

> If the server process exits unexpectedly, the client **SHOULD** restart it. Because the
> protocol is stateless, any in-flight requests are simply lost and the client can retry them
> against the fresh process.

**[inference]** Under a `2026-07-28` server, "restart the MCP server" is a supported recovery
rather than a session-destroying event. Under a legacy server it is not, because the restart
throws away everything `initialize` established — which is precisely OpenKnowledge's
situation, next.

---

## 6 — OpenKnowledge 0.55.2, measured: a legacy-era server

**[measured]** `ok --version` → `0.55.2`. `/Users/abuusama/.ok/bin/ok` is a symlink to
`/Applications/OpenKnowledge.app/Contents/Resources/cli/bin/ok.sh`, a bash wrapper that runs
the bundled Electron as a Node host. The MCP server lives in the minified bundle under
`.../cli/dist/`.

**[measured]** Protocol-version literals found anywhere in `dist/`: `2025-06-18`, twice, and
nothing else. No `2026-07-28`, no `2025-11-25`. Both occurrences are the *client* side —
`dist/index.mjs:1379`, in an unminified TypeScript block wiring `ok mcp` into Pi:

```ts
await next.request("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "pi", version: "1.0.0" },
}, { timeoutMs: INIT_TIMEOUT_MS });
next.notify("notifications/initialized", {});
```

**[measured]** The server side vendors a pre-`2026-07-28` SDK: `dist/index.mjs` and
`dist/src-CQVK23qz.mjs` contain Zod schemas for `roots/list`,
`notifications/roots/list_changed` and `ping` — three things `2026-07-28` deprecates or
deletes — plus a capability-assertion switch that throws *"Client does not support listing
roots (required for roots/list)"*. The server installs `server.oninitialized`, so it is
handshake-driven.

**[measured]** The routing itself. The roots probe (`dist/*.mjs`, function `Xl`, deminified):

```js
async function Xl(e) {
  if (!e.getClientCapabilities()?.roots) return;          // legacy: capabilities from initialize
  let t;
  try { t = await e.listRoots(); }                        // server-initiated roots/list
  catch (t) { e.log?.(`listRoots fallback failed: …`); return; }
  let n = t.roots ?? [];
  if (n.length !== 1) return;                             // routes ONLY on exactly one root
  let r = Yl(n[0].uri);                                   // file:// URI → fs path
  …
}
```

and the resolver (`Zl`), which is the three mechanisms in priority order:

```js
async function Zl(e, t, n, r = Jl) {
  if (e !== void 0) { let t = r(e); return { projectDir: t, viaRootGuess: false, nextSticky: t }; }  // 1. explicit `cwd` arg
  if (t !== void 0) { let e = r(t); return { projectDir: e, viaRootGuess: false, nextSticky: e }; }  // 2. sticky session value
  let i = await n();                                                                                 // 3. the roots guess
  return i === void 0 ? { projectDir: void 0, … } : { projectDir: r(i), viaRootGuess: true, nextSticky: void 0 };
}
```

and the error when none of the three resolves — which names two of them out loud **[measured]**:

> `` `cwd` is required for tool calls against the global MCP server. Pass an absolute path
> inside an OpenKnowledge project, or have the MCP client advertise a single root. ``

and a warning it emits when it routed via roots into a repo with multiple worktrees
**[measured]**:

> Routed to `${e}` from the MCP client's single advertised root, but this repo has `${t}` git
> worktrees. If you are working in a worktree, pass its path as `cwd` on OK tool calls once —
> **it sticks for the session**, so reads, writes, and the preview all target that worktree
> instead of this checkout.

### Every one of the three is on the wrong side of `2026-07-28`

| Mechanism | Status under `2026-07-28` **[read]** |
|---|---|
| explicit `cwd` argument on the tool call | **The endorsed one.** Roots' own migration path is *"pass directories or files via tool parameters"*, and Stateful Tools says a handle is an ordinary argument. |
| **sticky per-session value** | **Forbidden.** *"Servers **MUST NOT** rely on prior requests over the same connection to establish context"*; a stdio process *"is not a conversation or session"*. |
| single advertised **root** | **Deprecated** (earliest removal 2027-07-28), *and* reshaped — `roots/list` now only arrives inside an MRTR `InputRequiredResult`. |

**[inference]** OpenKnowledge is therefore a legacy-era server that Ambient must talk to
today, and its most durable routing mechanism is the one that is just a tool argument.
Whether Ambient supplies it, and from where, is the design question §7 leaves open.

---

## What this constrains in Ambient

Not a design. The constraints the spec imposes, tied to the files that exist.

1. **`McpServer` types a launch, not a connection.** `src/modules/home/types.ts:85-90` is
   `{ name, command, args, env }` — a stdio spawn recipe. `2026-07-28` adds two things a host
   must decide per server that this type cannot express **[read]**: which **protocol era**
   the server speaks (Modern / Legacy / Dual-era, a per-server property the spec says clients
   **SHOULD** cache), and whether the host holds a **`subscriptions/listen`** stream against
   it for `toolsListChanged`. Also absent: any transport other than stdio. Streamable HTTP
   servers cannot be declared at all, and it is the only non-deprecated remote transport.

2. **The measured OpenKnowledge routing gap is a real gap, and the spec narrows the options
   without closing them.** `src/modules/home/internal/templates.ts:32-35` declares
   `{ command: ok, args: [mcp], env: {} }` — supplying none of the three mechanisms §6
   measured. Of the three, `2026-07-28` **forbids** the sticky one and **deprecates** the
   roots one, leaving the per-call `cwd` argument as the only mechanism with a future. That
   is a per-call value, not a per-server one — so it does not obviously belong in `McpServer`
   at all. **[inference]** It looks like a `harness` concern, because `harness` is the seam
   that already knows the session's `cwd` (`docs/design/seams.md:31`). Recorded, not decided.

3. **`cwd` is doing two unrelated jobs and only one of them is safe.** *Decided — do not
   re-litigate* says *"`cwd` is the chat's own folder"* and that this does not conflict with
   one shared knowledge base *"because OpenKnowledge is addressed over MCP, not by path"*.
   That holds for the **filesystem plane**. It does **not** hold for the MCP plane as
   OpenKnowledge implements it today: `ok mcp` routes on a path, and takes it from a tool
   argument, a sticky session value, or a root. **[inference]** The two planes are less
   separate than `docs/design/product.md`'s *two planes* table implies, and the coupling is
   OpenKnowledge's, not the protocol's.

4. **Hot-reload of a server's tools is not free any more.** `docs/design/product.md` requires
   that adding a capability never restart the daemon. **[read]** For tools appearing inside
   an already-attached server, `2026-07-28` offers exactly two mechanisms: a long-lived
   `subscriptions/listen` request per server with `toolsListChanged: true`, or re-listing on
   the server's `ttlMs`. The unsolicited push that `2025-11-25` allowed is gone. Whoever owns
   the MCP connection — `capabilities`, or `harness` if it collapses in
   (`docs/design/seams.md:85-86`) — owns a long-lived request per server, or owns a cache
   clock. Adding a **new server** to a chat's list stays free.

5. **The reflector must be designed as a stateless server with explicit handles.** The
   product model has Ambient running *"one small MCP server that reflects a chat's granted
   agents as tools"*, with `linear__dispatch(objective)` enqueuing and returning immediately.
   **[read]** `2026-07-28` forbids relating one call to the next by connection, and its
   Stateful Tools guidance prescribes the alternative: mint an opaque handle, accept it as an
   argument, validate authorization against it on **every** call, state its lifetime in the
   creation tool's description, and return a **tool execution error** (not a protocol error)
   on an expired handle. If the reflector ever needs input mid-call it must use MRTR, which
   means `requestState` must be integrity-protected. The official `io.modelcontextprotocol/tasks`
   extension is the standardised form of the same shape and should be read before hand-rolling.

6. **Any MCP client Ambient builds or configures must be dual-era, and must probe.**
   **[read]** Modern-client-against-legacy-server *"Fails"*, sometimes silently, sometimes by
   the legacy server processing `tools/call` under legacy semantics. The prescribed stdio
   probe is `server/discover` first, with fallback on any non-modern error — never keyed to a
   single error code. OpenKnowledge 0.55.2 is legacy **[measured]**, so this is not
   hypothetical: it is the only MCP server in `templates.ts`.

7. **Roots is not a place to put a decision.** Ambient does not currently advertise roots at
   all. **[read]** Roots is deprecated with an earliest removal of 2027-07-28, is
   *"informational guidance rather than an access-control mechanism"*, and is not enforced by
   the protocol. **[inference]** Building the chat-folder grant on roots would put a security
   boundary on a mechanism the spec says is not one, and is scheduled for deletion.

8. **A server declaration will eventually need an auth shape, and stdio is the exception that
   buys time.** **[read]** stdio implementations *"**SHOULD NOT** follow"* the authorization
   spec and should *"retrieve credentials from the environment"* — which `McpServer.env`
   already covers. The moment a chat's config names an HTTP server, the whole OAuth surface
   arrives (`iss` validation, issuer-keyed credentials, Client ID Metadata Documents, DCR
   deprecated), and none of it fits in `{ name, command, args, env }`.

9. **`CONTEXT.md` has a word collision worth naming.** **[inference]** "session" now means two
   different things: Ambient's *"one agent session"* (`harness`, `run(spec) → Receipt`), and
   MCP's protocol session — which `2026-07-28` **abolished**. Under
   `docs/rules/language.md` (*one word, one meaning*) this is the kind of thing that produces
   a design error later, and OpenKnowledge's *"it sticks for the session"* warning is already
   using the second sense.

---

## What this does not establish

- **Whether Pi speaks `2026-07-28`.** Not measured; Pi was not read. `dist/index.mjs:1379`
  shows OpenKnowledge's own Pi wiring sending `initialize` with `protocolVersion:
  "2025-06-18"` **[measured]**, which suggests legacy, but that is OpenKnowledge's code, not
  Pi's. This overlaps the roadmap's separate open question *"How does Pi take per-session MCP
  config?"* and should be answered there.
- **Whether any first-party SDK has shipped `2026-07-28` yet.** I read the specification and
  its normative schema, not the SDK release state. A spec revision existing is not the same
  as an implementation existing, and §3.5's compatibility matrix only matters once one does.
- **Where the OpenKnowledge `cwd` argument should be supplied from.** §6 measures the three
  mechanisms and the spec narrows them to one. It does not say whether that value belongs in
  `McpServer`, in `harness`, or in the call site. Live design question, deliberately left open.
- **Whether OpenKnowledge intends to move to `2026-07-28`.** Unknown. The bundle is a build
  artefact, not a roadmap. The `ttlMs`/era/subscription constraints above assume it stays
  legacy until measured otherwise.
- **What the tool-vs-MCP split should be for Ambient specifically.** §4 establishes the spec
  is silent and prices both sides. The decision is the principal's and belongs in an ADR.
- **Anything about the `2026-07-28` `tasks` extension beyond its changelog entry.** The
  extension page was not read.
- **Nothing was written outside this repo.** `~/.ok/` and `~/.ambient/` were read only —
  `ls`, `cat`, `grep`, and one `ok --version`. No MCP server was started, no OpenKnowledge
  project touched. The schema file was downloaded to the session scratchpad.
