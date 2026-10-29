#!/usr/bin/env bun
// AI-generated: written by an AI assistant (Copilot).
//
// Background observer, started by the userPromptSubmitted hook:
//   bun skill-observer/worker.ts <sessionId> <turn>
// Asks Jev which skills the current turn needs and records them as `pending` in the state file.

import { loadConfig } from "./config.ts";
import { loadSkills } from "./skills.ts";
import { log, MAIN_AGENT, readState, updateState } from "./state.ts";
import { readTranscript, recentConversation, taskSummary, type Message } from "./transcript.ts";

export async function runObserver(sessionId: string, turn: number): Promise<void> {
  const cfg = loadConfig();
  try {
    const state = readState(cfg.stateDir, sessionId);
    if (!state || state.turn !== turn) {
      log(cfg.stateDir, sessionId, `observer turn ${turn}: superseded before start`);
      return;
    }
    const apiKey = process.env.TYPESAFE_API_KEY;
    if (!apiKey) throw new Error("TYPESAFE_API_KEY is not set");
    // Imported here so a missing SDK is logged and clears the in-flight marker.
    const { createClient, observe } = await import("./observe.ts");

    const injected = new Set(state.injected.filter((i) => i.agent === MAIN_AGENT).map((i) => i.skill));
    const candidates = loadSkills(cfg.skillsDirs).filter((s) => !injected.has(s.name));

    let transcript = readTranscript(cfg.copilotHome, sessionId);
    if (transcript.length === 0) transcript = state.prompts.map((text): Message => ({ from: "user", text }));
    const { earlier, latest } = recentConversation(transcript, state.prompts.at(-1) ?? "", cfg.recentTurns);

    const started = Date.now();
    const verdict = await observe(
      createClient(apiKey),
      {
        task_summary: taskSummary(cfg.copilotHome, sessionId, state.firstPrompt),
        earlier_conversation: earlier,
        latest_user_message: latest,
      },
      candidates,
      cfg.model,
    );

    const applied = updateState(cfg.stateDir, sessionId, (s) => {
      // A newer prompt owns the state now; its own observer will decide.
      if (!s || s.turn !== turn || s.observer?.turn !== turn) return { result: false };
      s.pending = verdict.skills;
      s.pendingTurn = turn;
      s.observer = null;
      return { state: s, result: true };
    });

    const rel = verdict.judgments.relevance
      .filter((r) => r.p >= 0.3)
      .map((r) => `${r.skill}=${r.p.toFixed(2)}`)
      .join(" ");
    log(
      cfg.stateDir,
      sessionId,
      `observer turn ${turn}: ${verdict.skills.length ? verdict.skills.join(", ") : "NONE"}` +
        ` (acting=${verdict.judgments.acting.toFixed(2)} ${rel}; ${verdict.model}, ${Date.now() - started}ms)` +
        (applied ? "" : " [discarded: superseded]"),
    );
  } catch (err) {
    log(cfg.stateDir, sessionId, `observer turn ${turn} failed: ${err instanceof Error ? err.message : String(err)}`);
    // Fail silent: no verdict means no injection.
    try {
      updateState(cfg.stateDir, sessionId, (s) => {
        if (!s || s.observer?.turn !== turn) return { result: undefined };
        s.observer = null;
        return { state: s, result: undefined };
      });
    } catch {
      // Nothing more to do; the hook treats a long-running observer as dead.
    }
  }
}

if (import.meta.main) {
  const [sessionId, turn] = process.argv.slice(2);
  if (!sessionId || !turn || !Number.isInteger(Number(turn))) {
    console.error("Usage: bun skill-observer/worker.ts <sessionId> <turn>");
    process.exit(2);
  }
  await runObserver(sessionId, Number(turn));
}
