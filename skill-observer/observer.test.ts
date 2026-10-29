// AI-generated: written by an AI assistant (Copilot).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, type Config } from "./config.ts";
import { onPreCompact, onPreToolUse, onUserPromptSubmitted, type SpawnObserver } from "./hook.ts";
import { decide, THRESHOLDS } from "./questions.ts";
import { loadSkills, parseSkill } from "./skills.ts";
import { logPath, readState, updateState } from "./state.ts";
import { lastTurns, parseEvents, recentConversation } from "./transcript.ts";
import { runObserver } from "./worker.ts";

const SESSION = "test-session";
let root: string;
let cfg: Config;

function writeSkill(name: string, description: string, body: string) {
  const dir = join(root, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "skill-observer-test-"));
  writeSkill("script-writing", "Use when writing scripts.", "# Script writing\nUse TypeScript.");
  writeSkill("testing", "Use when writing tests.", "# Testing\nUse bun test.");
  process.env.SKILL_OBSERVER_SKILLS_DIRS = join(root, "skills");
  process.env.SKILL_OBSERVER_STATE_DIR = join(root, "state");
  process.env.COPILOT_HOME = join(root, "copilot");
  process.env.SKILL_OBSERVER_WAIT_MS = "1000";
  cfg = loadConfig();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const noSpawn: SpawnObserver = () => undefined;

function finishObserver(turn: number, pending: string[]) {
  updateState(cfg.stateDir, SESSION, (s) => {
    if (!s || s.observer?.turn !== turn) return { result: undefined };
    s.pending = pending;
    s.pendingTurn = turn;
    s.observer = null;
    return { state: s, result: undefined };
  });
}

// A real process, so the preToolUse hook's synchronous wait can observe it finishing.
const delayedObserver =
  (pending: string[], delayMs: number): SpawnObserver =>
  (sessionId, turn) => {
    const script = `
      import { updateState } from ${JSON.stringify(join(import.meta.dir, "state.ts"))};
      await Bun.sleep(${delayMs});
      updateState(${JSON.stringify(cfg.stateDir)}, ${JSON.stringify(sessionId)}, (s) => {
        s.pending = ${JSON.stringify(pending)}; s.pendingTurn = ${turn}; s.observer = null;
        return { state: s, result: undefined };
      });`;
    return spawn(process.execPath, ["-e", script], { stdio: "inherit" }).pid;
  };

describe("hook flow", () => {
  test("discuss, then do: blocks the first write once, then passes", async () => {
    // TURN 1: discussion. The observer returns NONE.
    const t1 = onUserPromptSubmitted({ sessionId: SESSION, prompt: "I'm interested in primes..." }, cfg, noSpawn);
    expect(t1.notices).toEqual(["observer: started (turn 1)"]);
    expect(t1.output).toEqual({});
    finishObserver(1, []);
    expect(onPreToolUse({ sessionId: SESSION, toolName: "create" }, cfg).output).toEqual({});

    // TURN 2: "OK, write the script". The observer is still in flight when the agent writes.
    const t2 = onUserPromptSubmitted(
      { sessionId: SESSION, prompt: "OK, write the script" },
      cfg,
      delayedObserver(["script-writing", "testing"], 300),
    );
    expect(t2.notices).toEqual(["observer: started (turn 2)"]);
    const blocked = onPreToolUse({ sessionId: SESSION, toolName: "create" }, cfg);
    expect(blocked.output.permissionDecision).toBe("deny");
    const reason = String(blocked.output.permissionDecisionReason);
    expect(reason).toContain("# Script writing");
    expect(reason).toContain("# Testing");
    expect(reason).not.toContain("description:");
    expect(blocked.notices).toEqual(["blocked create; injected: script-writing, testing"]);
    expect(readState(cfg.stateDir, SESSION)!.injected.map((i) => [i.skill, i.turn])).toEqual([
      ["script-writing", 2],
      ["testing", 2],
    ]);

    // The retry passes silently.
    expect(onPreToolUse({ sessionId: SESSION, toolName: "create" }, cfg)).toEqual({ notices: [], output: {} });

    // TURN 3: the observer would not re-suggest injected skills; even if pending repeats, nothing is re-injected.
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "now add a flag" }, cfg, noSpawn);
    finishObserver(3, ["script-writing"]);
    expect(onPreToolUse({ sessionId: SESSION, toolName: "edit" }, cfg).output).toEqual({});
  });

  test("passes through when the observer is still running after the wait", () => {
    process.env.SKILL_OBSERVER_WAIT_MS = "100";
    cfg = loadConfig();
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "write it" }, cfg, noSpawn);
    const started = Date.now();
    expect(onPreToolUse({ sessionId: SESSION, toolName: "create" }, cfg).output).toEqual({});
    expect(Date.now() - started).toBeGreaterThanOrEqual(100);

    // The verdict lands later and is caught on the next write.
    finishObserver(1, ["testing"]);
    expect(onPreToolUse({ sessionId: SESSION, toolName: "edit" }, cfg).output.permissionDecision).toBe("deny");
  });

  test("a new prompt drops the previous turn's unused verdict", () => {
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "write it" }, cfg, noSpawn);
    finishObserver(1, ["testing"]);
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "actually, just explain" }, cfg, noSpawn);
    finishObserver(2, []);
    expect(onPreToolUse({ sessionId: SESSION, toolName: "create" }, cfg).output).toEqual({});
  });

  test("subagents get their own injection", () => {
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "write it" }, cfg, noSpawn);
    finishObserver(1, ["testing"]);
    expect(onPreToolUse({ sessionId: SESSION, toolName: "create" }, cfg).output.permissionDecision).toBe("deny");
    expect(onPreToolUse({ sessionId: SESSION, toolName: "create", agentId: "sub-1" }, cfg).output.permissionDecision).toBe(
      "deny",
    );
    expect(onPreToolUse({ sessionId: SESSION, toolName: "create", agentId: "sub-1" }, cfg).output).toEqual({});
  });

  test("compaction clears injected skills", () => {
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "write it" }, cfg, noSpawn);
    finishObserver(1, ["testing"]);
    onPreToolUse({ sessionId: SESSION, toolName: "create" }, cfg);
    onPreCompact({ sessionId: SESSION }, cfg);
    const s = readState(cfg.stateDir, SESSION)!;
    expect(s.injected).toEqual([]);
    expect(s.pending).toEqual([]);
  });

  test("a long gap between prompts clears injected skills", () => {
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "write it" }, cfg, noSpawn);
    finishObserver(1, ["testing"]);
    onPreToolUse({ sessionId: SESSION, toolName: "create" }, cfg);
    updateState(cfg.stateDir, SESSION, (s) => {
      s!.lastPromptAt -= cfg.staleAfterMs + 1;
      return { state: s, result: undefined };
    });
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "back again" }, cfg, noSpawn);
    expect(readState(cfg.stateDir, SESSION)!.injected).toEqual([]);
  });

  test("unknown sessions and skills pass through", () => {
    expect(onPreToolUse({ sessionId: "never-seen", toolName: "create" }, cfg).output).toEqual({});
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "write it" }, cfg, noSpawn);
    finishObserver(1, ["renamed-skill"]);
    expect(onPreToolUse({ sessionId: SESSION, toolName: "create" }, cfg).output).toEqual({});
  });
});

describe("hook CLI", () => {
  const hook = join(import.meta.dir, "hook.ts");
  const run = (event: string, stdin: string) =>
    spawnSync(process.execPath, [hook, event], {
      input: stdin,
      encoding: "utf8",
      // Keep the spawned worker off the live API.
      env: { ...process.env, TYPESAFE_API_KEY: "" },
    });

  test("bad input never fails the hook", () => {
    for (const [event, stdin] of [
      ["pre-tool-use", "not json"],
      ["pre-tool-use", JSON.stringify({ sessionId: "../escape", toolName: "create" })],
      ["unknown-event", "{}"],
    ] as const) {
      const r = run(event, stdin);
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe("{}");
    }
  });

  test("emits progress lines before the final JSON", () => {
    const r = run("user-prompt-submitted", JSON.stringify({ sessionId: SESSION, prompt: "hi", timestamp: 0, cwd: root }));
    // The spawned worker fails fast without an API key; only the hook output matters here.
    expect(r.status).toBe(0);
    const lines = r.stdout.trim().split("\n");
    expect(JSON.parse(lines[0]!)).toEqual({ type: "progress", message: "skill-observer: observer: started (turn 1)" });
    expect(JSON.parse(lines.at(-1)!)).toEqual({});
  });
});

describe("worker", () => {
  test("a failed observer logs, clears the in-flight marker, and stays silent", async () => {
    const key = process.env.TYPESAFE_API_KEY;
    process.env.TYPESAFE_API_KEY = "";
    try {
      onUserPromptSubmitted({ sessionId: SESSION, prompt: "write it" }, cfg, noSpawn);
      await runObserver(SESSION, 1);
    } finally {
      process.env.TYPESAFE_API_KEY = key;
    }
    const s = readState(cfg.stateDir, SESSION)!;
    expect(s.observer).toBeNull();
    expect(s.pending).toEqual([]);
    expect(readFileSync(logPath(cfg.stateDir, SESSION), "utf8")).toContain("TYPESAFE_API_KEY is not set");
  });

  test("an observer for an old turn does nothing", async () => {
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "one" }, cfg, noSpawn);
    onUserPromptSubmitted({ sessionId: SESSION, prompt: "two" }, cfg, noSpawn);
    await runObserver(SESSION, 1);
    expect(readState(cfg.stateDir, SESSION)!.observer?.turn).toBe(2);
  });
});

describe("decide", () => {
  const rel = (p: number) => [{ skill: "s", p }];
  test("silent while the user is still discussing", () => {
    expect(decide({ acting: THRESHOLDS.acting - 0.01, relevance: rel(0.99) })).toEqual([]);
  });
  test("injects only clearly relevant skills once the user acts", () => {
    expect(decide({ acting: 0.9, relevance: rel(THRESHOLDS.relevant) })).toEqual(["s"]);
    expect(decide({ acting: 0.9, relevance: rel(THRESHOLDS.relevant - 0.01) })).toEqual([]);
  });
});

describe("skills", () => {
  test("indexes skills with descriptions", () => {
    writeSkill("folded", ">\n  Spans\n  lines.", "body");
    mkdirSync(join(root, "skills", "no-frontmatter"));
    writeFileSync(join(root, "skills", "no-frontmatter", "SKILL.md"), "# nothing");
    expect(loadSkills(cfg.skillsDirs).map((s) => [s.name, s.description])).toEqual([
      ["folded", "Spans lines."],
      ["script-writing", "Use when writing scripts."],
      ["testing", "Use when writing tests."],
    ]);
  });
  test("falls back to the directory name", () => {
    expect(parseSkill("---\ndescription: d\n---\n", "/x/my-skill", "/x/my-skill/SKILL.md")?.name).toBe("my-skill");
  });
});

describe("transcript", () => {
  const ev = (type: string, content: string, extra: object = {}) => JSON.stringify({ type, data: { content, ...extra } });
  const jsonl = [
    ev("user.message", "first"),
    ev("assistant.message", ""),
    ev("assistant.message", "reply one"),
    ev("assistant.message", "subagent chatter", { parentToolCallId: "t1" }),
    ev("tool.execution_start", "ignored"),
    "{broken",
    ev("user.message", "second"),
    ev("assistant.message", "reply two"),
    ev("user.message", "OK, write the script"),
  ].join("\n");

  test("keeps main-agent user and agent text only", () => {
    expect(parseEvents(jsonl).map((m) => `${m.from}:${m.text}`)).toEqual([
      "user:first",
      "agent:reply one",
      "user:second",
      "agent:reply two",
      "user:OK, write the script",
    ]);
  });

  test("takes the last N turns and does not repeat the latest prompt", () => {
    const messages = parseEvents(jsonl);
    expect(lastTurns(messages, 0)).toEqual([]);
    const { earlier, latest } = recentConversation(messages, "OK, write the script", 2);
    expect(latest).toBe("OK, write the script");
    expect(earlier.map((m) => m.text)).toEqual(["second", "reply two"]);
  });
});
