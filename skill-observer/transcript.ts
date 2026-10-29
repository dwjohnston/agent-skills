// AI-generated: written by an AI assistant (Copilot).

import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { join } from "node:path";

export interface Message {
  from: "user" | "agent";
  text: string;
}

const TAIL_BYTES = 2 * 1024 * 1024;

export function transcriptPath(copilotHome: string, sessionId: string): string {
  return join(copilotHome, "session-state", sessionId, "events.jsonl");
}

function readTail(path: string, bytes: number): string {
  const size = statSync(path).size;
  const start = Math.max(0, size - bytes);
  const buf = Buffer.alloc(size - start);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buf, 0, buf.length, start);
  } finally {
    closeSync(fd);
  }
  const text = buf.toString("utf8");
  // Drop the partial first line when we started mid-file.
  return start === 0 ? text : text.slice(text.indexOf("\n") + 1);
}

/** Main-agent user and agent messages from a Copilot `events.jsonl`, oldest first. */
export function parseEvents(jsonl: string): Message[] {
  const messages: Message[] = [];
  for (const line of jsonl.split("\n")) {
    if (line.trim() === "") continue;
    let event: { type?: string; data?: { content?: unknown; parentToolCallId?: unknown } };
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const data = event.data;
    if (!data || typeof data.content !== "string" || data.content.trim() === "") continue;
    if (data.parentToolCallId !== undefined) continue; // subagent traffic
    if (event.type === "user.message") messages.push({ from: "user", text: data.content.trim() });
    else if (event.type === "assistant.message") messages.push({ from: "agent", text: data.content.trim() });
  }
  return messages;
}

/** The messages making up the last `turns` user turns, where a turn starts at a user message. */
export function lastTurns(messages: Message[], turns: number): Message[] {
  if (turns <= 0) return [];
  let seen = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.from === "user" && ++seen === turns) return messages.slice(i);
  }
  return messages;
}

export function readTranscript(copilotHome: string, sessionId: string): Message[] {
  const path = transcriptPath(copilotHome, sessionId);
  if (!existsSync(path)) return [];
  return parseEvents(readTail(path, TAIL_BYTES));
}

/**
 * One-line task summary: the session's summary or title from `workspace.yaml`,
 * falling back to the first prompt we saw.
 */
export function taskSummary(copilotHome: string, sessionId: string, firstPrompt: string | undefined): string {
  const path = join(copilotHome, "session-state", sessionId, "workspace.yaml");
  let summary = "";
  if (existsSync(path)) {
    try {
      const meta = Bun.YAML.parse(readFileSync(path, "utf8")) as { summary?: unknown; name?: unknown } | null;
      if (typeof meta?.summary === "string") summary = meta.summary;
      else if (typeof meta?.name === "string") summary = meta.name;
    } catch {
      // Fall through to the first prompt.
    }
  }
  if (summary.trim() === "") summary = firstPrompt ?? "";
  return clip(summary.replace(/\s+/g, " ").trim(), 200);
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)} …[truncated]`;
}

/**
 * Recent conversation for the observer, ending with `latestPrompt`.
 * Agent messages are clipped harder than user messages: the user's words carry the intent.
 */
export function recentConversation(transcript: Message[], latestPrompt: string, turns: number) {
  const history = [...transcript];
  const last = history.at(-1);
  // The hook can run before or after the runtime records the prompt.
  if (last?.from === "user" && last.text === latestPrompt.trim()) history.pop();
  const earlier = lastTurns(history, Math.max(0, turns - 1)).map((m) => ({
    from: m.from,
    text: clip(m.text, m.from === "user" ? 3000 : 1500),
  }));
  return { earlier, latest: clip(latestPrompt.trim(), 4000) };
}
