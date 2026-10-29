// AI-generated: written by an AI assistant (Copilot).

import { TypeSafeClient } from "@typesafe-ai/sdk";
import { buildQuestions, decide, skillQuestionId, type Judgments, type ObserverState } from "./questions.ts";
import type { Skill } from "./skills.ts";

// Workaround for https://github.com/typesafe-ai/typesafe-sdk-js/issues/20: SDK 0.7.0 throws
// "Body already used" under Bun. Re-streaming each body from JavaScript avoids it.
// Remove once a fixed SDK version ships.
async function fetchForBun(input: string | URL | Request, init?: RequestInit) {
  const res = await fetch(input, init);
  if (res.body === null) return res;
  const bytes = new Uint8Array(await res.arrayBuffer());
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

export function createClient(apiKey: string): TypeSafeClient {
  return new TypeSafeClient({ apiKey, fetch: fetchForBun, timeout: 8000, retry: { maxRetries: 1 } });
}

export interface Verdict {
  skills: string[];
  judgments: Judgments;
  model: string;
}

/** Ask Jev about the conversation and each candidate skill, then decide in code. */
export async function observe(
  client: TypeSafeClient,
  state: ObserverState,
  candidates: Skill[],
  model?: string,
): Promise<Verdict> {
  if (candidates.length === 0) {
    return { skills: [], judgments: { acting: 0, relevance: [] }, model: "(not called)" };
  }
  const result = await client.systemOne({
    state: { ...state },
    questions: buildQuestions(candidates),
    model,
  });
  const judgments: Judgments = {
    acting: result.answers.acting!.noul,
    relevance: candidates.map((skill, i) => ({ skill: skill.name, p: result.answers[skillQuestionId(i)]!.noul })),
  };
  return { skills: decide(judgments), judgments, model: result.model };
}
