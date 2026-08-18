# INGEST · S2a — Telling "the CDN no longer has these bytes" from "retry would work"

**Question.** When a WhatsApp media download fails, how do we tell expired-on-the-CDN from
transient? The principal: *"these could potentially be things that are no longer on the
CDN... but part of the code spike should be how do we know what is what."*

**The measurement that raised it.** One completed sync on 2026-08-16 attempted **728**
downloads: **343 landed**, **10 deduped**, **375 failed** — reported as **353 `FAILED`** and
**22 `EXPIRED/GONE`**, none retried.

**Sources.** The `whatsappd` checkout at `/Users/abuusama/projects/whatsappd`, read only and
never written; its vendored `baileys@7.0.0-rc14`; and Ambient's own
`.spike-private/history/`. No network call was made and no socket opened.

Paths under `packages/whatsappd/` and `node_modules/` are relative to
`/Users/abuusama/projects/whatsappd/`; Ambient paths to `/Users/abuusama/projects/ambient/`.
**[read]** = asserted by the cited line. **[measured]** = computed here from a stored
artefact. **[inference]** = mine, asserted by no source.

---

## Verdicts

| # | Sub-question | Verdict |
|---|---|---|
| 1 | The error model | **Four reasons, derived from a real HTTP status** — `expired` (404/410), `throttled` (429), `unavailable` (5xx), `unknown` (no status, or any other status). Read off `error.output.statusCode` on Baileys' Boom. Not guessed, not string-matched. But the brief conflates two unions: `isRetryable`/`dispositionFor`/`FaultReason` are the **connection** error model and have nothing to do with media. |
| 2 | Is `EXPIRED/GONE` vs `FAILED` trustworthy? | **No. It is pure noise, and I can prove it.** The classifier did not exist on 2026-08-16 — it landed the next day. The spike regexed the raw Boom's message, which contains the CDN URL and **no status code at all**. All 22 `EXPIRED/GONE` matched the digit substrings `404`/`410` *inside the signed URL*. A base-rate control shows `404` hit at exactly the rate of `777`. **Zero of the 375 records carry a status.** |
| 3 | Re-upload | **Never fires.** Baileys gates the retry on `error?.status`, and the error is a Boom carrying `output.statusCode` with no `.status` property. Unreachable for the 404/410 it exists to catch. It also requires the **phone** to answer, not just the socket. The docstring on `MediaHandle.download()` still claims otherwise and is wrong. |
| 4 | Retry later from stored state? | **Impossible.** `DurableMedia` is `stored`+ref or `failed`+two-value reason. `mediaKey` and `directPath` appear **nowhere** in `src/`. A retry requires WhatsApp to redeliver the message. |
| 5 | Smallest change | **For the diagnostic run: none inside `whatsappd`.** A harness calling `download()` directly already receives a classified `MediaDownloadError` today. The whatsappd defect is one **bare `catch {}`** at `runtime/runtime.ts:74` that discards it — a three-line fix, needed only to make the *durable record* keep the distinction. |
| 6 | Throttling | **No media rate limiting of any kind.** `pacer.ts` has exactly one call site and it is outbound `send`. Media downloads are serial by accident — a `for…await` loop — with no cap, no gap, no backoff, and no retry. |

---

## 1 — The error model

### Two unions, and the brief conflates them

`isRetryable` and `dispositionFor` operate on **`FaultReason`**, the connection-fault union
(`packages/whatsappd/src/errors.ts:7-24`, `:54-56`, `:68-71`) **[read]**. They classify
*disconnects* — `restart_required`, `logged_out_remote`, `credentials_invalid` — and are
never applied to media. Media has its own, separate union and carries retryability as a
plain field on the error object, not through a `Disposition` table.

### `MediaDownloadReason` in full

`packages/whatsappd/src/errors.ts:150-165` **[read]**:

```ts
export type MediaDownloadReason =
  | "expired"      // 404/410 — the CDN no longer serves it
  | "throttled"    // 429 — too many downloads; the same fetch will work after a wait
  | "unavailable"  // 5xx — the far side is broken, not the request
  | "unknown";     // No status to read: transport failure, or bytes that would not decrypt
```

| Reason | Produced by | `retryable` |
|---|---|---|
| `expired` | `statusCode === 404 \|\| statusCode === 410` — `errors.ts:209-210` | **false** |
| `throttled` | `statusCode === 429` — `errors.ts:211` | **true** |
| `unavailable` | `statusCode >= 500` — `errors.ts:212` | **true** |
| `unknown` | `statusCode === undefined` (`errors.ts:208`) **or any other status**, e.g. 403 (`errors.ts:213`) | **false** |

`retryable` is computed in the constructor, `errors.ts:199` **[read]**:

```ts
this.retryable = reason === "throttled" || reason === "unavailable";
```

### Derived from a status, not a string

`errors.ts:204-214` **[read]** — the whole classifier:

```ts
export function classifyMediaDownload(error: unknown): MediaDownloadError {
  if (error instanceof MediaDownloadError) return error;
  const boom = error as { output?: { statusCode?: number } } | undefined;
  const statusCode = boom?.output?.statusCode;
  if (statusCode === undefined) return new MediaDownloadError("unknown");
  ...
```

No exception-string matching, no guessing. The status is real, and it comes from where
Baileys puts it — `node_modules/.pnpm/baileys@7.0.0-rc14_.../lib/Utils/messages-media.js:304`
**[read]**:

```js
throw new Boom(`Failed to fetch stream from ${url}`, { statusCode: response.status, data: { url } });
```

**The strongest evidence** is a test that drives a real HTTP server rather than a
hand-shaped object — `packages/whatsappd/tests/media-download-error.test.ts:73-113`
**[read]**, asserting `404→expired`, `410→expired`, `429→throttled`, `503→unavailable`,
`403→unknown`, and that no URL survives into the error. `tests/errors.test.ts:83-111`
**[read]** pins the same table at the unit level, citing issue `#205`: *"404-expired and
429-throttled reached callers as the same opaque failure."*

### The one gap in the model

**403 → `unknown`, non-retryable** (`errors.ts:213`, pinned at `tests/errors.test.ts:99-100`)
**[read]**. A signed-URL CDN commonly answers 403 for an expired signature. **[inference]**
This is the one status where the model may under-report expiry — a 403 is indistinguishable
from a decrypt failure once it becomes `unknown` without its `statusCode` being read.

---

## 2 — Is `EXPIRED/GONE` vs `FAILED` trustworthy? No, and here is the proof

### The classifier did not exist when the run happened

```
f225ee6  2026-08-17  feat(media): classify media download failures with the HTTP status (#206)
```

`git log --format='%h %ad %s' --date=short -- packages/whatsappd/src/errors.ts` **[read]**.
The same commit created `src/baileys/download.ts`'s classification call and
`tests/media-download-error.test.ts`. The measurement ran **2026-08-16**. `f225ee6` is an
ancestor of `HEAD` **[read]**, so the classifier is present *now* — it simply was not present
*then*.

### What the harness actually did

`.spike-private/history/spike.ts:177-180` **[read]** — the entire basis of the two labels:

```ts
/** "expired" is the answer we are actually hunting — separate it from other faults. */
const classify = (why: string): string =>
  /404|410|not found|expired|no longer|gone|unavailable/i.test(why)
    ? `EXPIRED/GONE — ${why}`
    : `FAILED — ${why}`;
```

and `spike.ts:215` **[read]**, which builds the string it tests:

```ts
const why = classify(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
```

A regex over a stringified error message. On 2026-08-16 that message was the **raw Boom**,
whose text is `Failed to fetch stream from <signed CDN url>` — the status lives on
`output.statusCode` and never appears in the message.

### The stored artefact settles it

`.spike-private/history/summary.json` retains the raw bucket map (written at
`spike.ts:585`). Reading it **[measured]**:

```
attempted 728   landed 343   deduped 10   failed 375
distinct bucket keys: 375        (every key unique — each embeds its own URL)

  352  [FAILED]        Error: Failed to fetch stream from <URL>
   22  [EXPIRED/GONE]  Error: Failed to fetch stream from <URL>
    1  [FAILED]        TypeError: fetch failed
```

**Both labels are the same error shape.** 374 of 375 are byte-identical in structure and
differ only in the URL. Bucket keys mentioning a status code at all: **0** **[measured]**.

Where the 22 matched **[measured]**:

```
tokens that triggered EXPIRED/GONE: {'404': 14, '410': 8}
match location:                     {'inside-URL': 22}
```

Every single one matched a digit substring **inside the signed CDN URL** — the random asset
id or the `oh=` token. None matched in the message prefix. There is no message prefix to
match; the prefix is the constant `Failed to fetch stream from`.

### The base-rate control

If the signal were real, `404`/`410` would appear far more often than arbitrary 3-digit
tokens. They do not **[measured]** — count of the 375 failure URLs containing each token:

| Token | Hits | Rate | |
|---|---|---|---|
| `404` | 14 | 3.7% | ← "expired" |
| `410` | 8 | 2.1% | ← "expired" |
| `403` | 11 | 2.9% | control |
| `500` | 10 | 2.7% | control |
| `429` | 8 | 2.1% | control |
| `777` | 14 | **3.7%** | control — **identical to `404`** |
| `888` | 12 | 3.2% | control |
| `311` | 19 | 5.1% | control |

`404` and `777` hit at exactly the same rate. `410` and `429` hit at exactly the same rate.

> **The 22/353 split carries no information whatsoever.** The correct reading of the
> 2026-08-16 run is **375 unclassified failures**, not 353 transport plus 22 expired. Any
> plan resting on "expiry is real but rare" rests on a coin flip.

### Can a genuine expiry be reported as bare `FAILED`, or vice versa?

**On the 2026-08-16 data: both, freely, and the labels are uncorrelated with truth.** A
genuinely-expired 410 whose URL happened to contain no `404`/`410` substring was labelled
`FAILED` (probability ≈ 94%); a throttled 429 whose URL happened to contain `404` was
labelled `EXPIRED/GONE`.

**Against today's `HEAD`, through a direct `download()` call**, the picture is much better —
here is the full trace table **[read, from `errors.ts:204-214` + `messages-media.js:304`]**:

| Failure | What Baileys throws | `output.statusCode` | Reason | `retryable` | Distinguishable? |
|---|---|---|---|---|---|
| CDN 404 / 410 | `Boom` | 404 / 410 | `expired` | false | **Yes, exactly** |
| CDN 429 | `Boom` | 429 | `throttled` | true | **Yes, exactly** |
| CDN 5xx | `Boom` | ≥500 | `unavailable` | true | **Yes, exactly** |
| CDN 403 (stale signature) | `Boom` | 403 | `unknown` | false | **No** — collapses with decrypt |
| Socket timeout | `TypeError`/`fetch failed` | *(absent)* | `unknown` | false | **No** |
| DNS failure | `TypeError`/`fetch failed` | *(absent)* | `unknown` | false | **No** |
| Decrypt failure (bad `mediaKey`) | plain `Error` | *(absent)* | `unknown` | false | **No** |

**So: the two are distinguishable exactly when the CDN answered with an HTTP status of 404,
410, 429, or 5xx.** They are indistinguishable when the request never got a status
(timeout, DNS, connection reset), when decryption failed, and — the one real modelling gap
— when the status was 403. The `unknown` bucket is a genuine four-way ambiguity, and it is
marked `retryable: false`, so a transient socket timeout is currently written off as
permanent.

**[inference]** Given 728 serial downloads over one sync with zero pacing, my expectation is
that the bulk of the 375 are 429s. But that is a prediction, not a measurement, and this
spike cannot settle it — see §5.

---

## 3 — Re-upload: documented, unreachable, and phone-dependent

### The documentation that raised the question

`packages/whatsappd/src/model/message.ts:104-114` **[read]**:

```ts
/**
 * Opaque, on-demand media: metadata now, bytes when you ask.
 * `download()` fetches + decrypts, transparently re-uploading expired media.
 ...
```

**This sentence is false, and the repo knows it.** `src/baileys/download.ts:7-12` **[read]**
states the correction and `tests/media-download-error.test.ts:115-145` pins it. The stale
claim at `message.ts:106` was not updated in `f225ee6`. *(Not ours to fix — read-only
checkout.)*

### Where the path is, and why it cannot fire

`src/baileys/download.ts:36-44` **[read]** — the socket is wired in correctly:

```ts
return (raw) => async () => {
  try {
    return await fetch(raw, "buffer", {}, { logger, reuploadRequest: sock.updateMediaMessage });
  } catch (error) {
    throw classifyMediaDownload(error);
  }
};
```

The gate is upstream — `node_modules/.pnpm/baileys@7.0.0-rc14_.../lib/Utils/messages.js:829-845`
**[read]**:

```js
const REUPLOAD_REQUIRED_STATUS = [410, 404];
export const downloadMediaMessage = async (message, type, options, ctx) => {
    const result = await downloadMsg().catch(async (error) => {
        if (ctx &&
            typeof error?.status === 'number' &&   // ← the gate
            REUPLOAD_REQUIRED_STATUS.includes(error.status)) {
            ...
            message = await ctx.reuploadRequest(message);
```

The error reaching that `catch` is the Boom from `messages-media.js:304`, which sets
`output.statusCode` and **no `.status`**. `typeof undefined === 'number'` is false, so the
branch is dead for every CDN 404/410. `tests/media-download-error.test.ts:139-141` **[read]**
asserts precisely this against a live local server:

```ts
expect(boom.output?.statusCode).toBe(410);
expect(typeof boom.status).toBe("undefined"); // ← what makes the gate unreachable
```

### It needs the phone, not just the socket

`node_modules/.pnpm/baileys@7.0.0-rc14_.../lib/Socket/messages-send.js:1011-1052` **[read]** —
`updateMediaMessage` sends a media-retry node and **waits for the primary device to answer**:

```js
await Promise.all([
    sendNode(node),
    waitForMsgMediaUpdate(async (update) => { ... })
]);
```

So the recovery requires (a) a live socket, (b) the primary device reachable, and (c) the
device still holding the original bytes.

### It would change what a failure means — and for the better

If the gate were reachable, `messages-send.js:1028-1033` **[read]** throws on a device-side
refusal with `statusCode: getStatusCodeForMediaRetry(media.result) || 404`, mapped at
`messages-media.js:782-787` **[read]**:

```js
{ SUCCESS: 200, DECRYPTION_ERROR: 412, NOT_FOUND: 404, GENERAL_ERROR: 418 }
```

**[inference]** This is the only *definitive* expiry test that exists anywhere in the stack.
A CDN 404 says "this URL is stale"; a completed re-upload round-trip returning `NOT_FOUND`
says "the device that authored this message no longer has the bytes" — which is the actual
question. Everything short of it is an inference from a CDN status.

---

## 4 — Can a failed download be retried later? No.

`packages/whatsappd/src/runtime/contracts.ts:56-66` **[read]** — the whole durable shape:

```ts
/** Durable outcome of consuming a live media handle while it was usable. */
export type DurableMedia =
  | (MediaMeta & { readonly state: "stored"; readonly ref: string; readonly byteLength: number })
  | (MediaMeta & { readonly state: "failed"; readonly reason: "download_failed" | "store_failed" });
```

`MediaMeta` (`src/model/message.ts:93-102` **[read]**) is `mimetype`, `fileLength`,
`fileName`, `seconds`, `ptt`, `width`, `height`, `caption`. **No `mediaKey`. No
`directPath`. No `url`. No `statusCode`.**

A repository-wide search confirms the earlier measurement — `grep -rn "mediaKey\|directPath" src/`
returns **exactly one hit, and it is a doc comment** (`src/baileys/download.ts:5`) **[read]**.

`src/runtime/projection.ts:314-319` **[read]** passes `message.media` through verbatim into
the `MessageRecord`, so the projection cannot add what the contract does not carry.

`MediaHandle.download()` (`src/model/message.ts:112-114`) is a closure over the live socket —
`src/baileys/download.ts:36` **[read]**. ADR-0015 chose this deliberately and says so:

> *"Persist metadata and download later: rejected because the live download closure cannot
> survive serialization"* — `docs/adr/0015-media-bytes-are-captured-immediately-and-durably.md`
> **[read]**

**Verdict.** A retry from stored state is not merely unimplemented, it is
**type-impossible**. Every failed blob from 2026-08-16 is unrecoverable except by getting
WhatsApp to redeliver the message — which the scope's own measurement says means paging that
chat, and is bounded by the sync window. This is exactly the "63 `NoHandle` messages remain
unrecovered" problem at 375× the scale.

---

## 5 — What would make the 375 classifiable

### The defect: a bare `catch` throws the answer away

`packages/whatsappd/src/runtime/runtime.ts:71-76` **[read]**:

```ts
      let bytes: Uint8Array;
      try {
        bytes = await source.download();
      } catch {
        return { ...message, media: { ...metadata, state: "failed", reason: "download_failed" } };
      }
```

**`catch` with no binding.** The `MediaDownloadError` — reason, status code and all — is
constructed correctly at `src/baileys/download.ts:42`, and destroyed one stack frame later.
It is not read, not logged, not persisted. The four-way classification `#206` added survives
for the length of a `throw`.

### The lazy recipe: for the diagnostic run, change nothing in `whatsappd`

The 2026-08-16 harness bypassed the runtime and called `msg.media.download()` directly
(`.spike-private/history/spike.ts:203` **[read]**). **On today's `HEAD` that same call site
already receives a fully classified `MediaDownloadError`** — `f225ee6` fixed it. The
harness's own regex is the only thing standing in the way.

So the smallest change that makes a future run classifiable is **in the Ambient harness, and
it is a deletion**: drop `spike.ts:177-180` and read the typed fields.

```ts
// replaces the regex at spike.ts:177-180
} catch (err) {
  media.failed++;
  const e = err as Partial<MediaDownloadError>;
  const key = e._tag === "MediaDownloadError"
    ? `${e.reason}/${e.statusCode ?? "none"}`     // expired/410, throttled/429, unknown/none
    : `nonstatus/${(err as Error).name}`;          // TypeError: fetch failed, decrypt, …
  failureBuckets.set(key, (failureBuckets.get(key) ?? 0) + 1);
}
```

Bucket keys become `expired/410`, `throttled/429`, `unavailable/503`, `unknown/403`,
`unknown/none` — and, as a free side effect, **stop embedding signed CDN URLs in a durable
artefact**, which `summary.json` currently does 375 times.

### The `whatsappd` change, if the *durable record* must keep the distinction

Only needed for the production ingest path, not for the diagnostic run. At
`runtime/runtime.ts:74`, bind the error and widen the contract:

```ts
// src/runtime/contracts.ts:63-66
  | (MediaMeta & {
      readonly state: "failed";
      readonly reason: "download_failed" | "store_failed";
      readonly downloadReason?: MediaDownloadReason;   // + expired | throttled | unavailable | unknown
      readonly statusCode?: number;                    // + the status, when there was one
    });

// src/runtime/runtime.ts:72-76
      } catch (error) {
        const e = error instanceof MediaDownloadError ? error : undefined;
        return { ...message, media: { ...metadata, state: "failed", reason: "download_failed",
          ...(e && { downloadReason: e.reason, ...(e.statusCode !== undefined && { statusCode: e.statusCode }) }) } };
      }
```

**One more edit is required than it looks.** The libSQL reader rebuilds `metadata` from a
**fixed 8-field allowlist** (`src/runtime/libsql.ts:530-553` **[read]**) and the `failed`
branch returns `{ ...metadata, state: "failed", reason }` (`libsql.ts:560-565` **[read]**).
Two new fields would be written to the row and then **silently dropped on read-back** —
not rejected, which is worse. `durableMedia()` must be widened in the same change.

**[inference]** Both fields optional keeps every existing row valid, and the reader already
carries an `allowLegacyMetadata` path (`libsql.ts:567-574`) showing shape migration is an
anticipated move here. It is additive and reversible. **But it is upstream work in a repo
another agent owns, and it is not on the critical path for answering the principal's
question** — the harness change alone settles it.

### Rank the three candidate changes

| Change | Where | Buys | Cost |
|---|---|---|---|
| **1. Read the typed error instead of regexing** | Ambient harness, `spike.ts:177-180` | The entire four-way split, plus URL redaction | **A deletion.** Do this. |
| **2. Retry once with backoff before recording `failed`** | Ambient harness drain loop | Separates *transient* from *persistent* regardless of status — the only thing that catches the statusless `unknown` bucket | ~10 lines |
| **3. Persist `downloadReason` + `statusCode`** | `whatsappd` — `contracts.ts:63-66` + `runtime.ts:74` + `libsql.ts:530-565` | Durable record keeps the distinction for production ingest | Upstream PR, additive, **three files not two** |

**[inference]** 1 and 2 together are sufficient and neither needs `whatsappd` touched. 3 is
right eventually but is not what unblocks the question.

---

## 6 — Throttling: none, on media, anywhere

### `pacer.ts` covers outbound sends only

One call site in the entire package — `src/session.ts:674` **[read]**:

```ts
const ref = await pacer.run(() => c.send(to, msg, opts)); // FIFO + anti-ban gap
```

constructed at `src/session.ts:384` **[read]** as `createPacer(config.sendMinGapMs ?? 1000)`.
Its own docstring says so — `src/pacer.ts:1-9` **[read]**: *"Send pacing… outbound sends are
funnelled through a FIFO queue."* A repo-wide grep for `pacer` returns `session.ts`,
`pacer.ts` and `tests/pacer.test.ts`, nothing else **[read]**.

**Media downloads are not paced.**

### Media is serial by accident, not by design

`src/runtime/runtime.ts:514-521` **[read]**:

```ts
    conversationSync: async (batch) => {
      const messages: DurableInboundMessage[] = [];
      for (const message of batch.messages)
        messages.push(await captureMessage(accountId, backend.media, message));
```

A `for…await` loop. Each `captureMessage` does one `download()` then one `mediaStore.write()`
(`runtime.ts:73`, `:78-86`) before the next message starts, and the whole loop runs **before
`accept()` is called** at `runtime.ts:521`. So one media download blocks the entire batch's
durable acceptance — which is why, as the brief notes, the media failure rate sets history
sync throughput.

**There is no concurrency cap** (there is no concurrency), **no minimum gap, no backoff, and
no retry** anywhere on the media path. The only "rate limit" is the incidental serialization,
and the runtime pays its full latency cost while getting none of its protective benefit
deliberately.

**[inference]** A serial loop is not a defence against 429 — it sets an *unbounded* request
rate limited only by RTT. 728 requests as fast as the CDN answers, no gap, is a plausible
throttle trigger, and nothing in the stack would slow down in response or retry afterwards.

---

## What the live half would have to do

A concrete recipe for the socket-bound run. Everything below is settled by the AFK half; none
of it needs a `whatsappd` change.

1. **Delete the regex.** Replace `.spike-private/history/spike.ts:177-180` with the typed
   read in §5. Bucket on `` `${reason}/${statusCode ?? "none"}` ``. This alone converts every
   future failure from noise into evidence, and stops writing signed URLs into
   `summary.json`.

2. **Retry once, with backoff, before recording `failed`.** Sleep ~2s, re-call the *same*
   `download()` thunk (the handle is still live in-process), and record the outcome as a
   `first→second` pair: `throttled→ok`, `throttled→throttled`, `expired→expired`,
   `unknown→ok`, `unknown→unknown`. **`unknown→ok` is the whole point** — it is the only way
   to separate a transient socket failure from a decrypt failure, since neither carries a
   status. Cap total retries so a genuinely throttled run does not double in length.

3. **Pace the drain and record the pacing.** The current loop has no gap
   (`runtime.ts:516-517`). Run the harness twice: once at full speed, once with a ~200ms gap
   between downloads. **If the failure rate collapses under pacing, the answer is throttling
   and the fix is a media pacer.** If it does not move, the failures are real and the fix is
   re-upload. This is the single most informative experiment available and it needs no
   protocol knowledge.

4. **Test the re-upload path directly, once.** For a handful of confirmed `expired/410`
   messages, call `sock.updateMediaMessage(raw)` by hand — the socket is live and the method
   is on it (`messages-send.js:1011`). A returned message means the bytes exist and the CDN
   URL was merely stale (Baileys' gate is broken, not the recovery). A `NOT_FOUND` throw
   (`statusCode: 404` via `messages-media.js:785`) is the **only definitive proof of expiry
   in the entire stack**. Requires the phone reachable — confirm it is, and note whether it
   was, since a phone-offline result is not an expiry result.

5. **Probe 403 explicitly.** `403` currently collapses to `unknown` non-retryable
   (`errors.ts:213`). If the live run shows a meaningful `unknown/403` bucket, that is an
   upstream classification bug worth reporting — a stale signed-URL 403 is expiry, not
   ambiguity.

6. **Report the denominator.** State attempted / landed / deduped / failed *and* the full
   bucket table. The 2026-08-16 report gave a split with no evidence behind it and it
   propagated into the scope document as settled fact.

---

## What this does not establish

- **Why the 375 actually failed.** This is the honest headline: the run's own artefact
  cannot answer it, because on 2026-08-16 no status was ever captured. The 48% failure rate
  is real; its cause is entirely unmeasured. My throttling expectation in §2 is
  **[inference]** and nothing here supports it.
- **Whether the CDN returned 429 at all.** Zero of the 375 records carry a status. It is
  equally consistent with 429s, with connection resets from an unpaced serial loop, or with
  a mix.
- **Whether re-upload would actually recover anything.** §3 proves the gate is unreachable
  and the path needs the phone. It does not prove the phone still holds the bytes — that is
  step 4 of the live recipe and cannot be read from source.
- **Whether pacing helps.** §6 establishes there is none. Whether adding it lowers the
  failure rate is step 3, and is an experiment, not a reading.
- **The 403 question.** Whether WhatsApp's CDN uses 403 for expired signatures is not
  determinable from this checkout.
- **What Ambient's production ingest will do.** This spike read `whatsappd`'s runtime path,
  which is one candidate. Finding 04 establishes Ambient may supply its own
  `WhatsAppBackend`; if it does, `runtime.ts:74` is a path Ambient may never execute, and the
  `catch {}` defect would be ours to not-repeat rather than theirs to fix.
- **Nothing was run.** No socket was opened, no network call made, no file in
  `~/projects/whatsappd` created, edited, or deleted. The only commands run against that
  checkout were `git log` and `git merge-base --is-ancestor`, both read-only.
