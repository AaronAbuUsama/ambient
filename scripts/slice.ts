/**
 * `vp run slice` — where the active slice is, and what to type next.
 *
 * It holds no state. Everything below is read from the roadmap, the slice's own files and
 * the ticket statuses, so it cannot drift from reality the way a status document does.
 *
 * The five steps and their gates are docs/rules/slices.md; this reports which gate is the
 * next one that has not passed.
 */
import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
const read = (rel: string): string => fs.readFileSync(path.join(REPO, rel), "utf8");
const exists = (rel: string): boolean => fs.existsSync(path.join(REPO, rel));

/** The row marked `◐ active` in the roadmap's status board. */
function activeSlice(): string | undefined {
  for (const line of read("docs/design/roadmap.md").split("\n")) {
    const m = /^\|\s*\*\*(\w[\w-]*)\*\*\s*\|\s*◐/.exec(line);
    if (m?.[1] !== undefined) return m[1];
  }
  return undefined;
}

/** The five headings map-slice writes, and what each currently holds. */
function scopeSections(text: string): Readonly<Record<string, readonly string[]>> {
  const out: Record<string, string[]> = {};
  let current = "";
  for (const line of text.split("\n")) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h?.[1] !== undefined) {
      current = h[1];
      out[current] = [];
      continue;
    }
    const item = line.trim();
    if (current !== "" && item.startsWith("-")) out[current]?.push(item.replace(/^-\s*/, ""));
  }
  return out;
}

type Ticket = { readonly file: string; readonly status: string };

function tickets(dir: string): readonly Ticket[] {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(path.join(REPO, dir))
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const line = read(path.join(dir, f))
        .split("\n")
        .find((l) => l.startsWith("**Status:**"));
      return { file: f, status: line?.replace("**Status:**", "").trim() ?? "unknown" };
    });
}

const say = (s: string): void => process.stdout.write(`${s}\n`);

const slice = activeSlice();
if (slice === undefined) {
  say("No slice is marked ◐ active in docs/design/roadmap.md.");
  process.exit(1);
}

const dir = `docs/planning/${slice.toLowerCase()}`;
const scopeAt = `${dir}/scope.md`;
const specAt = `${dir}/spec.md`;

say(`\n  ${slice}   —   docs/rules/slices.md\n`);

if (!exists(scopeAt)) {
  say("  step 1 · MAP        no scope.md yet");
  say(`\n  next:  /map-slice ${slice}\n`);
  process.exit(0);
}

const sections = scopeSections(read(scopeAt));
const open = sections["Open"] ?? [];
const fog = sections["Fog"] ?? [];
const decided = sections["Decided"] ?? [];

say(`  step 1 · MAP        scope.md — ${decided.length} decided`);

if (open.length > 0 || fog.length > 0) {
  say(`  step 2 · FRONTIER   ${open.length} open, ${fog.length} in fog`);
  for (const q of open) say(`                      · ${q.slice(0, 88)}`);
  const first = open[0];
  say(
    first === undefined
      ? "\n  next:  sharpen a fog entry until it can be stated as a question\n"
      : `\n  next:  work one question — the kind says how. ${open.length} left, then plan-slice\n`,
  );
  process.exit(0);
}

if (!exists(specAt)) {
  say("  step 2 · FRONTIER   clear — open and fog are both empty");
  say(`\n  next:  /plan-slice ${slice}\n`);
  process.exit(0);
}

const all = tickets(`${dir}/issues`);
const done = all.filter((t) => t.status === "done");
say(`  step 3 · PLAN       spec.md — ${all.length} tickets`);
say(`  step 4 · BUILD      ${done.length}/${all.length} done`);
for (const t of all.filter((t) => t.status !== "done")) {
  say(`                      · ${t.file.replace(/\.md$/, "")}  [${t.status}]`);
}

say(
  done.length === all.length && all.length > 0
    ? `\n  next:  /close-slice ${slice}\n`
    : "\n  next:  take the first ticket whose blockers are done — one per session\n",
);
