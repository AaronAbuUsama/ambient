import { describe as describeHome } from "~/modules/home/service.ts";
import { describe as describeIngest, runIngest, summarise } from "~/modules/ingest/service.ts";
import { accountOf } from "../account.ts";
import type { Command } from "../command.ts";
import { message, misuse } from "../command.ts";

/**
 * `ambient ingest --into <slug>` — one call to [`ingest`](../../../ingest/types.ts).
 *
 * Argv in, one outcome out. **The operation is not here**: reading the mirror,
 * storing Blobs and appending the Transcript are ordered writes with a meaningful
 * crash story, and they belong to the module that owns that order.
 *
 * The two refusals below happen before any I/O, and they are the point. Reading a
 * conversation nobody opted into is the one mistake this verb must never make.
 */
export const ingest: Command = async (home, rest) => {
  const flag = rest[0];
  const slug = rest[1];
  if (flag !== "--into" || slug === undefined || rest.length > 2) {
    return misuse("usage: ambient ingest --into <slug>");
  }

  const chat = home.chats().find((found) => found.slug === slug);
  if (chat === undefined) {
    return message(false, `Chat "${slug}" does not exist; run \`ambient chat add ${slug}\` first`);
  }

  const bound = chat.read();
  if ("problems" in bound) return message(false, bound.problems.map(describeHome).join("; "));

  if (bound.peer === "") {
    return message(
      false,
      `Chat "${slug}" has no peer; set \`peer\` in its config.yaml to the id \`ambient peers ${bound.source.name}\` lists`,
    );
  }
  if (!bound.source.allow.includes(bound.peer)) {
    return message(
      false,
      `Peer "${bound.peer}" is not in source "${bound.source.name}" allow list; nothing was read`,
    );
  }

  const transcript = chat.transcript();
  if ("problems" in transcript) {
    return message(false, transcript.problems.map(describeHome).join("; "));
  }
  const account = accountOf(home, bound.source.name);
  if ("kind" in account) return account;

  const report = await runIngest({
    account,
    peer: bound.peer,
    transcript,
    blobs: home.blobs,
  });
  return "problems" in report
    ? message(false, report.problems.map(describeIngest).join("; "))
    : message(true, summarise(report, slug));
};
