/**
 * The mirror read. `whatsappd` stops here and goes no further into this codebase.
 *
 * Three rules, each measured rather than assumed — see
 * `docs/planning/ingest/findings/07-backends-and-the-mirror-read.md`:
 *
 * 1. **One `read()` per answer.** The view is valid only inside the callback, and
 *    everything inside it sees one revision. Two reads are two revisions.
 * 2. **Never call the store's own `snapshot()`/`messages()` from inside a callback.**
 *    Use the `view` handed in; the store opens a second transaction behind the first.
 * 3. **Paging terminates.** `nextBefore` is present only when a strictly older row
 *    exists, and the order is the composite `(timestamp, messageId)` — so a
 *    timestamp collision cannot drop or repeat a message across a boundary.
 */

import { fileMediaStore, libsqlBackend } from "whatsappd";
import type {
  ChatRecord,
  LibsqlBackend,
  MessageRecord,
  StoredMessageCursor,
  WhatsAppDataStore,
} from "whatsappd";
import type { Account, Peer } from "../types.ts";

/**
 * `MirrorView` and `WhatsAppSnapshot` are the read surface `whatsappd`'s own docs
 * name, and neither is exported from its package root — measured against
 * `0.4.0-alpha.3`. Deriving them off `read`'s callback keeps this honest: a
 * hand-written structural copy would still compile the day upstream changes one.
 */
type MirrorView = Parameters<Parameters<WhatsAppDataStore["read"]>[1]>[0];
type Snapshot = Awaited<ReturnType<MirrorView["snapshot"]>>;

/** A database page size, unrelated to WhatsApp's own 50. Chosen for a bulk read. */
const PAGE = 500;

export const backendFor = (account: Account): LibsqlBackend =>
  libsqlBackend({
    url: `file:${account.store.path}`,
    accountId: account.name,
    media: fileMediaStore({ directory: account.media.path }),
  });

export const causeOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

/** A group carries its own subject; a 1:1 is named through the alias map. */
export const subjectOf = (chat: ChatRecord, snapshot: Snapshot): string => {
  if (chat.subject !== undefined && chat.subject !== "") return chat.subject;
  const contactId = snapshot.contactAliases[chat.chatId];
  const contact =
    contactId === undefined
      ? undefined
      : snapshot.contacts.find((found) => found.contactId === contactId);
  return (
    contact?.displayName ??
    contact?.profileName ??
    contact?.verifiedName ??
    contact?.username ??
    chat.chatId
  );
};

/**
 * Every message in one chat, oldest first.
 *
 * The mirror pages newest-first, and a Transcript reads forwards, so the reversal
 * happens once here rather than in every caller.
 */
export const allMessages = async (
  view: MirrorView,
  chatId: string,
): Promise<readonly MessageRecord[]> => {
  const all: MessageRecord[] = [];
  let before: StoredMessageCursor | undefined;
  for (;;) {
    const page = await view.messages(chatId, { ...(before && { before }), limit: PAGE });
    all.push(...page.messages);
    if (page.nextBefore === undefined) break;
    before = page.nextBefore;
  }
  return all.reverse();
};

/** The snapshot has no per-chat message count, so a Peer list has to page for it. */
export const peerOf = (chat: ChatRecord, snapshot: Snapshot, messages: number): Peer => ({
  id: chat.chatId,
  subject: subjectOf(chat, snapshot),
  isGroup: chat.isGroup,
  messages,
  newest: chat.lastMessageAt,
});
