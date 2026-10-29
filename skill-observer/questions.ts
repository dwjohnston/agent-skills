// AI-generated: written by an AI assistant (Copilot).
//
// All observer question wording, thresholds, and the decision table live here.
// Jev makes the judgments; `decide` maps them to the skills to inject.

import { noul, type NoulQuestion } from "@typesafe-ai/sdk";
import type { Skill } from "./skills.ts";

export const THRESHOLDS = {
  /** A skill's relevance must clear this. Set high: a false positive pollutes context. */
  relevant: 0.7,
  /** Below this, the user is clearly still discussing, so nothing is injected yet. */
  acting: 0.3,
};

export interface ObserverState {
  task_summary: string;
  earlier_conversation: { from: "user" | "agent"; text: string }[];
  latest_user_message: string;
}

export function skillQuestionId(index: number): string {
  return `skill_${index}`;
}

export function buildQuestions(skills: Skill[]) {
  const questions: Record<string, NoulQuestion> = {
    acting: noul("Does `latest_user_message` ask the agent to start producing or changing something now?", {
      true: "The user tells the agent to do the work now, such as \"ok, write the script\" or \"go ahead and fix it\".",
      false:
        "The user is still discussing: describing an interest, asking a question, or weighing options, such as \"I'm interested in finding primes between two values\".",
    }),
  };
  skills.forEach((skill, i) => {
    questions[skillQuestionId(i)] = noul(
      `Does the guide "${skill.name}" apply to the work the user wants from the agent in this conversation? The guide says: ${skill.description}`,
      {
        true: "The guide covers the kind of work the user wants done.",
        false: "The guide covers a different kind of work from what the user wants done.",
      },
    );
  });
  return questions;
}

export interface Judgments {
  acting: number;
  relevance: { skill: string; p: number }[];
}

/**
 * The decision table:
 *
 * | acting            | relevance          | outcome        |
 * |-------------------|--------------------|----------------|
 * | < acting          | any                | NONE           |
 * | >= acting         | >= relevant        | inject skill   |
 * | >= acting         | < relevant         | skip skill     |
 */
export function decide(j: Judgments): string[] {
  if (j.acting < THRESHOLDS.acting) return [];
  return j.relevance.filter((r) => r.p >= THRESHOLDS.relevant).map((r) => r.skill);
}
