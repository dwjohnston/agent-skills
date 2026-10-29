// AI-generated: written by an AI assistant (Copilot).

import { existsSync, mkdirSync, openSync, closeSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

export const MAIN_AGENT = "main";

export interface Injection {
  skill: string;
  turn: number;
  at: number;
  /** `main`, or the subagent's agentId: each agent's context is separate. */
  agent: string;
}

export interface State {
  version: 1;
  sessionId: string;
  turn: number;
  lastPromptAt: number;
  firstPrompt?: string;
  /** Recent prompts from userPromptSubmitted; a fallback when the transcript can't be read. */
  prompts: string[];
  /** The observer currently running, if any. */
  observer: { turn: number; startedAt: number; pid?: number } | null;
  /** Skills the latest completed observer wants injected. */
  pending: string[];
  pendingTurn: number;
  injected: Injection[];
}

export function newState(sessionId: string): State {
  return {
    version: 1,
    sessionId,
    turn: 0,
    lastPromptAt: 0,
    prompts: [],
    observer: null,
    pending: [],
    pendingTurn: 0,
    injected: [],
  };
}

// Session IDs come from hook input; keep them from escaping the state dir.
function safeId(sessionId: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(sessionId) || sessionId.startsWith(".")) {
    throw new Error(`Unexpected session ID: ${JSON.stringify(sessionId)}`);
  }
  return sessionId;
}

export function statePath(stateDir: string, sessionId: string): string {
  return join(stateDir, `${safeId(sessionId)}.json`);
}

export function logPath(stateDir: string, sessionId: string): string {
  return join(stateDir, `${safeId(sessionId)}.log`);
}

export function readState(stateDir: string, sessionId: string): State | undefined {
  const path = statePath(stateDir, sessionId);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as State;
}

function writeState(stateDir: string, state: State): void {
  ensureDir(stateDir);
  const path = statePath(stateDir, state.sessionId);
  const tmp = `${path}.${process.pid}.tmp`;
  // Prompts are user data: keep the file private.
  writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  renameSync(tmp, path);
}

function ensureDir(stateDir: string): void {
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
}

const LOCK_STALE_MS = 5000;
const LOCK_WAIT_MS = 3000;

function acquireLock(lock: string): void {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      closeSync(openSync(lock, "wx"));
      return;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
    try {
      if (Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) rmSync(lock, { force: true });
    } catch {
      // The holder released it between our checks.
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for lock ${lock}`);
    Bun.sleepSync(10);
  }
}

/**
 * Read, change, and write a session's state under a lock file.
 * `fn` gets `undefined` when no state exists; return `undefined` to leave the file untouched.
 */
export function updateState<T>(
  stateDir: string,
  sessionId: string,
  fn: (state: State | undefined) => { state?: State; result: T },
): T {
  ensureDir(stateDir);
  const lock = `${statePath(stateDir, sessionId)}.lock`;
  acquireLock(lock);
  try {
    const { state, result } = fn(readState(stateDir, sessionId));
    if (state) writeState(stateDir, state);
    return result;
  } finally {
    rmSync(lock, { force: true });
  }
}

export function log(stateDir: string, sessionId: string, message: string): void {
  try {
    ensureDir(stateDir);
    appendFileSync(logPath(stateDir, sessionId), `${new Date().toISOString()} ${message}\n`, { mode: 0o600 });
  } catch {
    // Logging must never break a hook.
  }
}
