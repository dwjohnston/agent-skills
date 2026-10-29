#!/usr/bin/env bun
// AI-generated: written by an AI assistant (Copilot).
//
// Copilot command hook entry point:
//   bun skill-observer/hook.ts <user-prompt-submitted|pre-tool-use|pre-compact>
// Reads the camelCase hook payload on stdin and writes one JSON object to stdout.

import { spawn } from "node:child_process";
import { join } from "node:path";
import { loadConfig, type Config } from "./config.ts";
import { loadSkills, skillBody, type Skill } from "./skills.ts";
import { log, MAIN_AGENT, newState, readState, updateState, type State } from "./state.ts";

function help() {
  console.log(`
Skill observer hooks for the Copilot harness.

Usage:
  bun skill-observer/hook.ts <event> < payload.json

Events:
  user-prompt-submitted   Start the background observer for the new turn.
  pre-tool-use            Block the first file write that needs pending skills, injecting them.
  pre-compact             Forget injected skills, since compaction may drop them.

Options:
  -h, --help   Show this message

Exit codes:
  0  Always. Errors are logged to the session log and the hook passes through,
     because a failing preToolUse command hook would deny the tool call.
`);
}

export interface HookResult {
  /** Single-line notices for the user, emitted as Copilot progress messages. */
  notices: string[];
  output: Record<string, unknown>;
}

const PASS: HookResult = { notices: [], output: {} };

interface Payload {
  sessionId: string;
  prompt?: string;
  toolName?: string;
  agentId?: string;
}

function parsePayload(raw: string): Payload {
  const data = JSON.parse(raw) as Record<string, unknown>;
  // Accept the VS Code compatible snake_case payload too.
  const sessionId = data.sessionId ?? data.session_id;
  if (typeof sessionId !== "string") throw new Error("Hook payload has no sessionId");
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    sessionId,
    prompt: str(data.prompt),
    toolName: str(data.toolName ?? data.tool_name),
    agentId: str(data.agentId ?? data.agent_id),
  };
}

export type SpawnObserver = (sessionId: string, turn: number) => number | undefined;

const spawnObserver: SpawnObserver = (sessionId, turn) => {
  const child = spawn(process.execPath, [join(import.meta.dir, "worker.ts"), sessionId, String(turn)], {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
  return child.pid;
};

export function onUserPromptSubmitted(p: Payload, cfg: Config, spawnFn: SpawnObserver = spawnObserver): HookResult {
  const now = Date.now();
  const { turn, aged } = updateState(cfg.stateDir, p.sessionId, (prev) => {
    const s: State = prev ?? newState(p.sessionId);
    const aged = s.injected.length > 0 && s.lastPromptAt > 0 && now - s.lastPromptAt > cfg.staleAfterMs;
    if (aged) s.injected = [];
    s.turn += 1;
    s.lastPromptAt = now;
    const prompt = p.prompt ?? "";
    s.firstPrompt ??= prompt;
    s.prompts = [...s.prompts, prompt].slice(-Math.max(1, cfg.recentTurns));
    // Default to silence: drop the last verdict rather than act on a stale one.
    s.pending = [];
    s.observer = { turn: s.turn, startedAt: now };
    return { state: s, result: { turn: s.turn, aged } };
  });
  if (aged) log(cfg.stateDir, p.sessionId, `turn ${turn}: long gap since last prompt, cleared injected skills`);

  const pid = spawnFn(p.sessionId, turn);
  updateState(cfg.stateDir, p.sessionId, (s) => {
    if (!s || s.observer?.turn !== turn) return { result: undefined };
    s.observer.pid = pid;
    return { state: s, result: undefined };
  });
  log(cfg.stateDir, p.sessionId, `turn ${turn}: observer started (pid ${pid ?? "?"})`);
  return { notices: [`observer: started (turn ${turn})`], output: {} };
}

function observerRunning(s: State, cfg: Config, now: number): boolean {
  return s.observer !== null && s.observer.turn === s.turn && now - s.observer.startedAt < cfg.observerTimeoutMs;
}

export function formatInjection(toolName: string, skills: Skill[]): string {
  const blocks = skills.map(
    (s) => `<skill name="${s.name}" dir="${s.dir}">\n${skillBody(s)}\n</skill>`,
  );
  return [
    `[skill-observer] Paused this ${toolName} call so you can load skill instructions for the current work.`,
    `Read them, then retry the call, adjusted to follow them. They are injected once, so keep following them for the rest of this task.`,
    `Paths inside a skill are relative to its dir.`,
    "",
    ...blocks,
  ].join("\n");
}

export function onPreToolUse(p: Payload, cfg: Config): HookResult {
  let state = readState(cfg.stateDir, p.sessionId);
  if (!state) return PASS;

  const deadline = Date.now() + cfg.waitMs;
  while (observerRunning(state, cfg, Date.now()) && Date.now() < deadline) {
    Bun.sleepSync(50);
    state = readState(cfg.stateDir, p.sessionId) ?? state;
  }
  if (observerRunning(state, cfg, Date.now())) {
    log(cfg.stateDir, p.sessionId, `turn ${state.turn}: ${p.toolName} passed, observer still running`);
    return PASS;
  }
  if (state.pending.length === 0) return PASS;

  const agent = p.agentId ?? MAIN_AGENT;
  const available = new Map(loadSkills(cfg.skillsDirs).map((s) => [s.name, s]));
  const toInject = updateState(cfg.stateDir, p.sessionId, (s) => {
    if (!s) return { result: [] as Skill[] };
    const have = new Set(s.injected.filter((i) => i.agent === agent).map((i) => i.skill));
    const skills = s.pending.filter((n) => !have.has(n)).flatMap((n) => available.get(n) ?? []);
    if (skills.length === 0) return { result: skills };
    const at = Date.now();
    s.injected.push(...skills.map((sk) => ({ skill: sk.name, turn: s.turn, at, agent })));
    return { state: s, result: skills };
  });
  if (toInject.length === 0) return PASS;

  const names = toInject.map((s) => s.name).join(", ");
  log(cfg.stateDir, p.sessionId, `turn ${state.turn}: blocked ${p.toolName} (${agent}), injected ${names}`);
  return {
    notices: [`blocked ${p.toolName}; injected: ${names}`],
    output: { permissionDecision: "deny", permissionDecisionReason: formatInjection(p.toolName ?? "tool", toInject) },
  };
}

export function onPreCompact(p: Payload, cfg: Config): HookResult {
  const cleared = updateState(cfg.stateDir, p.sessionId, (s) => {
    if (!s) return { result: 0 };
    const n = s.injected.length;
    s.injected = [];
    s.pending = [];
    return { state: s, result: n };
  });
  if (cleared > 0) log(cfg.stateDir, p.sessionId, `compaction: cleared ${cleared} injected skill(s)`);
  return PASS;
}

const HANDLERS: Record<string, (p: Payload, cfg: Config) => HookResult> = {
  "user-prompt-submitted": (p, cfg) => onUserPromptSubmitted(p, cfg),
  "pre-tool-use": onPreToolUse,
  "pre-compact": onPreCompact,
};

export function runHook(event: string, raw: string): HookResult {
  const handler = HANDLERS[event];
  if (!handler) throw new Error(`Unknown event "${event}"`);
  return handler(parsePayload(raw), loadConfig());
}

if (import.meta.main) {
  const event = process.argv[2];
  if (event === "-h" || event === "--help" || event === undefined) {
    help();
    process.exit(event === undefined ? 2 : 0);
  }
  let result = PASS;
  let raw = "";
  try {
    raw = await Bun.stdin.text();
    result = runHook(event, raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`skill-observer: ${message}`);
    try {
      const sessionId = (JSON.parse(raw) as { sessionId?: unknown }).sessionId;
      if (typeof sessionId === "string") log(loadConfig().stateDir, sessionId, `${event} hook error: ${message}`);
    } catch {
      // Already reported on stderr.
    }
  }
  for (const notice of result.notices) {
    console.log(JSON.stringify({ type: "progress", message: `skill-observer: ${notice}` }));
  }
  console.log(JSON.stringify(result.output));
  process.exit(0);
}
