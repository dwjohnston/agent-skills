#!/usr/bin/env bun
// AI-generated: written by an AI assistant (Copilot) as a demo of @typesafe-ai/sdk.

import { parseArgs } from "node:util";
import { cleanEnv, str } from "envalid";
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";

const DEFAULT_TICKET = "I was charged twice for my subscription this month. Please fix this ASAP!";

function help() {
  console.log(`
Demonstrate the TypeSafe Jev models via @typesafe-ai/sdk.

Lists the models available to your account, then asks one systemOne request
three typed questions about a support ticket:
  - isComplaint  (noul:   yes/no probability)
  - category     (choice: billing | technical | other)
  - urgency      (score:  0 = low .. 2 = high)

Usage:
  bun jev-demo.ts [ticket text] [--model <name>]

Arguments:
  [ticket text]    Ticket to evaluate (default: "${DEFAULT_TICKET}")

Options:
  --model <name>   Model to use (default: the SDK default, TYPESAFE_DEFAULT_MODEL or jev-latest)
  -h, --help       Show this message

Environment:
  TYPESAFE_API_KEY   Required. Your TypeSafe API key.

Example:
  bun jev-demo.ts "The app crashes when I upload a photo" --model jev-preview
`);
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      model: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    help();
    process.exit(0);
  }

  // 👇
  const env = cleanEnv(process.env, { TYPESAFE_API_KEY: str() });
  const ticket = positionals.join(" ") || DEFAULT_TICKET;

  await main(ticket, env.TYPESAFE_API_KEY, values.model);
}

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

export async function main(ticket: string, apiKey: string, model?: string) {
  const client = new TypeSafeClient({ apiKey, fetch: fetchForBun });

  const models = await client.models.list();
  console.log("Available models:");
  for (const m of models) {
    console.log(`  - ${m.name} (${m.release_date}): ${m.description}`);
  }

  console.log(`\nTicket: ${JSON.stringify(ticket)}`);

  const { answers, model: usedModel, usage } = await client.systemOne({
    state: { ticket },
    questions: {
      isComplaint: noul("Is the customer complaining?"),
      category: choice("What is this ticket about?", {
        billing: "Payments, charges, refunds or invoices",
        technical: "Bugs, crashes or something not working",
        other: null,
      }),
      urgency: score("How urgent is this ticket?", ["low", "medium", "high"]),
    },
    model,
  });

  console.log(`\nModel used: ${usedModel}`);
  console.log(`isComplaint: P(yes) = ${answers.isComplaint.noul.toFixed(3)}`);
  console.log(
    `category:    ${answers.category.choice} (confidence ${answers.category.confidence.toFixed(3)})`,
  );
  console.log(`             probabilities ${JSON.stringify(answers.category.probabilities)}`);
  console.log(
    `urgency:     ${answers.urgency.score.toFixed(2)} on 0..2 (confidence ${answers.urgency.confidence.toFixed(3)})`,
  );
  console.log(`             legend ${JSON.stringify(answers.urgency.legend)}`);
  console.log(`\nUsage: ${usage.input_tokens ?? "?"} input / ${usage.output_tokens ?? "?"} output tokens`);
}
