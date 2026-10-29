// AI-generated: written by an AI assistant (Copilot).

import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "..");

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative number, got "${raw}"`);
  return n;
}

// Read on every call so tests can change the environment between runs.
export function loadConfig() {
  const skillsDirs = (process.env.SKILL_OBSERVER_SKILLS_DIRS ?? join(REPO_ROOT, "skills"))
    .split(":")
    .filter((d) => d !== "")
    .map((d) => resolve(REPO_ROOT, d));

  return {
    skillsDirs,
    stateDir: process.env.SKILL_OBSERVER_STATE_DIR ?? join(tmpdir(), `skill-observer-${process.getuid?.() ?? "user"}`),
    copilotHome: process.env.COPILOT_HOME ?? join(homedir(), ".copilot"),
    // How long a preToolUse hook waits for an in-flight observer before passing through.
    waitMs: numberFromEnv("SKILL_OBSERVER_WAIT_MS", 1000),
    // An observer that has run longer than this is treated as dead.
    observerTimeoutMs: numberFromEnv("SKILL_OBSERVER_TIMEOUT_MS", 20_000),
    // A gap between prompts longer than this clears injected skills.
    staleAfterMs: numberFromEnv("SKILL_OBSERVER_STALE_MS", 2 * 60 * 60 * 1000),
    recentTurns: numberFromEnv("SKILL_OBSERVER_RECENT_TURNS", 3),
    // Overrides the SDK default (TYPESAFE_DEFAULT_MODEL, then jev-latest).
    model: process.env.SKILL_OBSERVER_MODEL || undefined,
  };
}

export type Config = ReturnType<typeof loadConfig>;
