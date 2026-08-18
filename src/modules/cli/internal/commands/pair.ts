import {
  describe as describeChannel,
  describeProgress,
  pair,
  summarisePair,
} from "~/modules/channel/service.ts";
import { accountOf } from "../account.ts";
import type { Command } from "../command.ts";
import { message, misuse, report } from "../command.ts";

/**
 * `ambient pair <source>` — one call to [`channel`](../../../channel/types.ts).
 *
 * Argv in, one outcome out, and a progress line whenever `channel` has something
 * to say. **The operation is not here.** This handler never learns what a batch
 * is, what a lease is, or that a database exists.
 *
 * Positional, because a Source is what is being paired and there is nothing else
 * for the argument to be.
 */
export const pairSource: Command = async (home, rest, _zone, say) => {
  const name = rest[0];
  if (name === undefined || rest.length > 1) return misuse("usage: ambient pair <source>");

  // A Source is a configured thing. Pairing one that is not in `config.yaml`
  // would put a credential on disk that nothing can ever read.
  const account = accountOf(home, name);
  if ("kind" in account) return account;

  // `converge` before the credential lands, so the directory `home` vouches for
  // exists before `whatsappd` is pointed at a file inside it.
  const converged = await home.source(name).converge();
  if (converged.length > 0) return report(converged);

  const result = await pair({
    account,
    onProgress: (progress) => {
      say(describeProgress(progress));
      if (progress.step === "challenge" && progress.qr !== undefined) say(progress.qr);
    },
  });
  return "problems" in result
    ? message(false, result.problems.map(describeChannel).join("; "))
    : message(true, summarisePair(result, name));
};
