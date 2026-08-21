import { describe as describeHome } from "~/modules/home/service.ts";
import { open, describe as describeViolation } from "~/modules/knowledge/service.ts";
import { from, unseen } from "~/modules/observe/service.ts";
import { describe as describeTranscript, readTranscript } from "~/modules/transcript/service.ts";
import type { Command } from "../command.ts";
import { message, misuse } from "../command.ts";

/**
 * `ambient observe --from <slug>` — wiring only. The order of the writes is
 * `observe.from`, `observe.unseen`, one `base.write`; there is no `observe.run`
 * to call instead — see [`observe/types.ts`](../../../observe/types.ts) for why.
 */
export const observe: Command = async (home, rest) => {
  const slug = rest[0] === "--from" ? rest[1] : undefined;
  if (slug === undefined || rest.length > 2) return misuse("usage: ambient observe --from <slug>");

  const chat = home.chats().find((found) => found.slug === slug);
  if (chat === undefined) {
    return message(false, `Chat "${slug}" does not exist; run \`ambient chat add ${slug}\` first`);
  }

  const global = home.read();
  if ("problems" in global) return message(false, global.problems.map(describeHome).join("; "));
  const place = chat.transcript();
  if ("problems" in place) return message(false, place.problems.map(describeHome).join("; "));
  const lines = await readTranscript(place);
  if ("problems" in lines) return message(false, lines.problems.map(describeTranscript).join("; "));

  const base = open(home.knowledge);
  const existing = await base.all();
  if ("problems" in existing) {
    return message(false, existing.problems.map(describeViolation).join("; "));
  }

  const fresh = unseen(from(lines), existing);
  const report = await base.write(global.schema, fresh);
  const said = [
    `wrote ${report.wrote.length}`,
    ...report.refused.map((r) => describeViolation({ at: r.at, detail: r.why })),
  ].join("; ");
  return message(report.refused.length === 0, said);
};
