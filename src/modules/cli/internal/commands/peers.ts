import { describe as describeChannel, openMirror } from "~/modules/channel/service.ts";
import type { Peer } from "~/modules/channel/types.ts";
import { accountOf } from "../account.ts";
import type { Command } from "../command.ts";
import { message, misuse } from "../command.ts";

/**
 * `ambient peers <source>` — the read path, and the verb that makes the Slice
 * usable: a Peer id cannot be pasted into a `config.yaml` that nobody can find.
 *
 * **Positional, and `peers` rather than `chats`.** A Peer is the Source's own
 * identifier for one conversation; a Chat is Ambient's own noun and `ambient chat
 * add` already owns it. One word, one meaning.
 *
 * No socket, no lease, no runtime — and it writes nothing at all.
 */
const rows = (peers: readonly Peer[]): string => {
  const sorted = [...peers].sort((a, b) => b.newest - a.newest);
  const widths = sorted.reduce(
    (widest, peer) => ({
      id: Math.max(widest.id, peer.id.length),
      subject: Math.max(widest.subject, peer.subject.length),
      messages: Math.max(widest.messages, String(peer.messages).length),
    }),
    { id: 4, subject: 7, messages: 8 },
  );
  return sorted
    .map((peer) =>
      [
        peer.id.padEnd(widths.id),
        peer.subject.padEnd(widths.subject),
        String(peer.messages).padStart(widths.messages),
        peer.newest === 0 ? "-" : new Date(peer.newest).toISOString(),
      ].join("  "),
    )
    .join("\n");
};

export const peers: Command = async (home, rest) => {
  const name = rest[0];
  if (name === undefined || rest.length > 1) return misuse("usage: ambient peers <source>");

  const account = accountOf(home, name);
  if ("kind" in account) return account;

  const mirror = await openMirror(account);
  if ("problems" in mirror) return message(false, mirror.problems.map(describeChannel).join("; "));
  const found = await mirror.peers();
  await mirror.close();
  if ("problems" in found) return message(false, found.problems.map(describeChannel).join("; "));

  return found.length === 0
    ? message(true, `Source "${name}" holds no conversations yet; run \`ambient pair ${name}\``)
    : message(true, rows(found));
};
