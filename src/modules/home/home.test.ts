/**
 * SKELETON's gate — docs/planning/skeleton/spec.md §4, verbatim and executable.
 *
 * Every assertion runs against a real temp directory, never an in-memory stand-in:
 * rename atomicity, symlink escapes and `EACCES` are what this area exists to get
 * right and what a stand-in models as fiction.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import { afterEach, expect, it } from "vite-plus/test";

import { describe as render, openHome } from "./service.ts";
import type { Home, Problem } from "./types.ts";

const made: string[] = [];

const tmp = (): string => {
  const dir = fs.mkdtempSync(`${os.tmpdir()}/ambient-gate-`);
  made.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const opened = (root: string): Home => {
  const home = openHome(root);
  if ("problems" in home) throw new Error(`openHome refused: ${home.problems.map(render).join()}`);
  return home;
};

/** An empty directory that has never been touched by `init`. */
const clean = () => {
  const root = `${tmp()}/home`;
  return { root, home: opened(root) };
};

const started = async (): Promise<{ root: string; home: Home }> => {
  const it = clean();
  expect(await it.home.converge()).toEqual([]);
  return it;
};

const said = (problems: readonly Problem[]): readonly string[] => problems.map(render);

const snapshot = (root: string): readonly string[] =>
  fs
    .readdirSync(root, { recursive: true, encoding: "utf8" })
    .sort()
    .map((rel) => {
      const st = fs.statSync(`${root}/${rel}`);
      return `${rel} ${st.isDirectory() ? "dir" : st.size} ${st.mtimeMs}`;
    });

// ── init on a clean machine produces a home doctor calls healthy ──────

it("1 · init on an empty directory reports nothing", async () => {
  const { home } = clean();
  expect(await home.converge()).toEqual([]);
});

it("2 · doctor immediately after is silent", async () => {
  const { home } = await started();
  expect(home.plan()).toEqual([]);
});

it("3 · init a second time writes nothing and still reports nothing", async () => {
  const { root, home } = await started();
  const before = snapshot(root);
  expect(await home.converge()).toEqual([]);
  expect(snapshot(root)).toEqual(before);
});

it("4 · init leaves a hand-edited identity.md intact", async () => {
  const { root, home } = await started();
  fs.writeFileSync(`${root}/identity.md`, "# Mine\n\nHand written.\n");
  expect(await home.converge()).toEqual([]);
  expect(fs.readFileSync(`${root}/identity.md`, "utf8")).toBe("# Mine\n\nHand written.\n");
});

// ── break any file by hand and doctor names it precisely ─────────────

it("5 · a deleted schema.yaml is named, restored by init, then silent", async () => {
  const { root, home } = await started();
  fs.rmSync(`${root}/schema.yaml`);
  expect(said(home.plan())).toContain("schema.yaml: missing");
  expect(await home.converge()).toEqual([]);
  expect(home.plan()).toEqual([]);
});

it("6 · an unknown key is named with its path and the known set", async () => {
  const { root, home } = await started();
  const broken = fs
    .readFileSync(`${root}/config.yaml`, "utf8")
    .replace("mcp:", "mpc:\n  x: {}\nmcp:");
  fs.writeFileSync(`${root}/config.yaml`, broken);
  expect(said(home.plan())).toContain(
    'config.yaml: unknown key "mpc" (known: sources, mcp, models, roles)',
  );
});

it("7 · a bad enum is named with the expected values and what was found", async () => {
  const { root, home } = await started();
  fs.writeFileSync(
    `${root}/config.yaml`,
    fs.readFileSync(`${root}/config.yaml`, "utf8").replace("mode: ingest", "mode: listen"),
  );
  expect(said(home.plan())).toContain(
    'config.yaml: sources.personal.mode must be one of ingest|speak, got "listen"',
  );
});

it("8 · malformed YAML is named with line and column", async () => {
  const { root, home } = await started();
  expect(await opened(root).agent("linear").converge()).toEqual([]);
  fs.writeFileSync(
    `${root}/agents/linear/agent.yaml`,
    "model: careful\nthinking: high\nscope: a: b\n",
  );
  const named = said(home.plan()).filter((s) => s.startsWith("agents/linear/agent.yaml:"));
  expect(named[0]).toMatch(/^agents\/linear\/agent\.yaml:3:\d+: malformed YAML — .+/);
});

it("9 · a role naming an undefined model profile is named with the known set", async () => {
  const { root, home } = await started();
  fs.writeFileSync(
    `${root}/config.yaml`,
    fs.readFileSync(`${root}/config.yaml`, "utf8").replace("digest: careful", "digest: thorough"),
  );
  expect(said(home.plan())).toContain(
    'config.yaml: roles.digest names model profile "thorough", which is not defined (known: fast, careful)',
  );
});

it("10 · a chat granting a nonexistent agent is named", async () => {
  const { root, home } = await started();
  expect(await home.chat("bug-reports").converge()).toEqual([]);
  const chat = `${root}/chats/bug-reports/config.yaml`;
  fs.writeFileSync(chat, fs.readFileSync(chat, "utf8").replace("agents: []", "agents: [linear]"));
  expect(said(home.plan())).toContain(
    'chats/bug-reports/config.yaml: agents names agent "linear", which is not defined (known: none)',
  );
});

it("11 · config.yml beside config.yaml is named as a near miss", async () => {
  const { root, home } = await started();
  fs.writeFileSync(`${root}/config.yml`, "sources: {}\n");
  expect(said(home.plan())).toContain('config.yml: bad name "config.yml" — expected "config.yaml"');
});

it("12 · an illegal name is named, and produces no Place and no directory", async () => {
  const { root, home } = await started();
  const escape = home.chat("../escape");
  expect(said(escape.plan())).toEqual([
    'chats/../escape: bad name "../escape" — expected ^[a-z0-9][a-z0-9-]{0,63}$',
  ]);
  expect(said(await escape.converge())).toEqual(said(escape.plan()));
  const granted = escape.cwd();
  expect("problems" in granted && said(granted.problems)).toEqual(said(escape.plan()));
  expect(fs.existsSync(`${root}/../escape`)).toBe(false);
  expect(fs.readdirSync(`${root}/chats`)).toEqual([]);

  fs.mkdirSync(`${root}/chats/Ops`);
  expect(said(home.plan())).toContain(
    'chats/Ops: bad name "Ops" — expected ^[a-z0-9][a-z0-9-]{0,63}$',
  );
});

// ── chat add produces a folder valid by construction ─────────────────

it("13 · chat add is silent and leaves doctor silent", async () => {
  const { home } = await started();
  expect(await home.chat("bug-reports").converge()).toEqual([]);
  expect(home.plan()).toEqual([]);
});

it("a Chat grants a foreign imports directory that doctor never reads inside", async () => {
  const { root, home } = await started();
  const chat = home.chat("bug-reports");
  expect(await chat.converge()).toEqual([]);
  const imports = chat.imports();
  if ("problems" in imports) throw new Error(said(imports.problems).join("\n"));
  fs.writeFileSync(`${imports.path}/opaque`, Buffer.alloc(1024 * 1024));
  expect(home.plan()).toEqual([]);

  fs.rmSync(imports.path, { recursive: true });
  fs.writeFileSync(imports.path, "wrong kind");
  expect(said(home.plan())).toContain("chats/bug-reports/imports/: expected a directory");
  expect(fs.existsSync(`${root}/chats/bug-reports/imports`)).toBe(true);
});

it("14 · chat add restores a deleted mandate and leaves config.yaml byte-identical", async () => {
  const { root, home } = await started();
  expect(await home.chat("bug-reports").converge()).toEqual([]);
  const config = `${root}/chats/bug-reports/config.yaml`;
  const before = fs.readFileSync(config);
  const stamped = fs.statSync(config).mtimeMs;
  fs.rmSync(`${root}/chats/bug-reports/mandate.md`);

  expect(await home.chat("bug-reports").converge()).toEqual([]);
  expect(fs.readFileSync(`${root}/chats/bug-reports/mandate.md`, "utf8")).not.toBe("");
  expect(fs.readFileSync(config)).toEqual(before);
  expect(fs.statSync(config).mtimeMs).toBe(stamped);
});

it("15 · agent add is silent and leaves doctor silent", async () => {
  const { home } = await started();
  expect(await home.agent("linear").converge()).toEqual([]);
  expect(home.plan()).toEqual([]);
});

// ── the invariants that are conventions only if they are checked ─────

/**
 * Production source only. `*.test.ts` is excluded because a test asserting a
 * refusal has to fail loudly, and `testing.ts` for the same reason — it is a
 * module's own scaffolding, the slot `whatsappd/testing` occupies one layer down,
 * and it is imported by tests and by nothing else.
 */
const sources = (): readonly { readonly rel: string; readonly text: string }[] =>
  fs
    .readdirSync(`${import.meta.dirname}/../..`, { recursive: true, encoding: "utf8" })
    .filter((rel) => rel.endsWith(".ts"))
    .filter((rel) => !rel.endsWith(".test.ts") && !rel.endsWith("/testing.ts"))
    .map((rel) => ({ rel, text: fs.readFileSync(`${import.meta.dirname}/../../${rel}`, "utf8") }));

it("16 · only home knows a path", () => {
  const offenders = sources()
    .filter((f) => !f.rel.startsWith("modules/home/"))
    .filter((f) => /path\.join|path\.resolve|__dirname/.test(f.text))
    .map((f) => f.rel);
  expect(offenders).toEqual([]);
});

it("17 · home opens no file whose size is bounded by traffic", () => {
  const reads = /readFile|createReadStream|readSync|\bopenSync\b/;
  const offenders = sources()
    .filter((f) => f.rel.startsWith("modules/home/"))
    .filter((f) => f.rel !== "modules/home/internal/disk.ts")
    .filter((f) => reads.test(f.text))
    .map((f) => f.rel);
  expect(offenders).toEqual([]);

  const disk = sources().find((f) => f.rel === "modules/home/internal/disk.ts");
  const union = /export type Parsed =([^;]+);/.exec(disk?.text ?? "");
  expect([...(union?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1])).toEqual([
    "identity.md",
    "config.yaml",
    "schema.yaml",
    "mandate.md",
    "agent.yaml",
    "SKILL.md",
  ]);
});

it("18 · every failure is a declared value, never a throw", () => {
  // The bare verb only: prose may still say "throws" or "throwing".
  const offenders = sources().filter((f) => /\bthrow\b/.test(f.text));
  expect(offenders.map((f) => f.rel)).toEqual([]);
});

// ── beyond the gate: the resolutions the interface promises ──────────

it("a chat reads as identity plus mandate, with its references resolved", async () => {
  const { root, home } = await started();
  expect(await home.agent("linear").converge()).toEqual([]);
  expect(await home.chat("bug-reports").converge()).toEqual([]);
  const config = `${root}/chats/bug-reports/config.yaml`;
  fs.writeFileSync(
    config,
    fs.readFileSync(config, "utf8").replace("agents: []", "agents: [linear]"),
  );

  const chat = home.chat("bug-reports").read();
  if ("problems" in chat) throw new Error(said(chat.problems).join("\n"));
  expect(chat.identity).toContain("# Ambient");
  expect(chat.mandate).toContain("bug-reports");
  expect(chat.source.mode).toBe("ingest");
  expect(chat.mcpServers.map((m) => m.command)).toEqual(["ok"]);
  expect(chat.agents.map((a) => a.name)).toEqual(["linear"]);
  expect(chat.agents[0]?.model).toBe("gpt-5.6-luna");
  expect(chat.model).toBe("gpt-5.6-luna");
  expect(chat.cwd.path).toBe(`${root}/chats/bug-reports`);
});

it("a home reads as identity, sources and the ontology", async () => {
  const { home } = await started();
  const global = home.read();
  if ("problems" in global) throw new Error(said(global.problems).join("\n"));
  expect(global.sources.map((s) => s.name)).toEqual(["personal", "ambient"]);
  expect(global.models.roles.speaker.model).toBe("gpt-5.6-luna");
  expect(global.schema.types.map((t) => t.name)).toContain("Commitment");
});

it("a symlink out of the home is refused, not followed", async () => {
  const { root, home } = await started();
  const outside = `${tmp()}/elsewhere`;
  fs.mkdirSync(outside, { recursive: true });
  fs.rmSync(`${root}/blobs`, { recursive: true });
  fs.symlinkSync(outside, `${root}/blobs`);
  expect(said(home.plan())).toContain("blobs/: a symlink here leaves the home");
});

it("init writes the OpenKnowledge scaffold itself, and spawns nothing", async () => {
  const { root } = await started();
  expect(fs.readdirSync(`${root}/knowledge`).sort()).toEqual([".ok", ".okignore"]);
  expect(fs.readdirSync(`${root}/knowledge/.ok`).sort()).toEqual([".gitignore", "config.yml"]);
  expect(fs.readFileSync(`${root}/knowledge/.ok/config.yml`, "utf8")).toContain(
    "# yaml-language-server: $schema=https://unpkg.com/@inkeep/open-knowledge@latest/dist/schemas/v0/config.project.schema.json",
  );
  expect(fs.readFileSync(`${root}/knowledge/.ok/.gitignore`, "utf8")).toContain("local/");
});
