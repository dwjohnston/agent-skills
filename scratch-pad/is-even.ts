#!/usr/bin/env bun
// AI-generated: written by an AI assistant (Copilot).

import { parseArgs } from "node:util";

function help() {
  console.log(`
Determine whether an integer is even.

Usage:
  bun is-even.ts <integer>

Arguments:
  <integer>    Whole number to check, e.g. 42, -7, 123456789012345678901234567890

Options:
  -h, --help   Show this message

Exit codes:
  0  The check ran (prints "even" or "odd")
  2  Invalid input

Example:
  bun is-even.ts 42
`);
}

export function isEven(n: bigint): boolean {
  return n % 2n === 0n;
}

// BigInt keeps arbitrarily large integers exact.
export function parseInteger(input: string): bigint | undefined {
  const trimmed = input.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) return undefined;
  return BigInt(trimmed);
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: false,
    options: {
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    help();
    process.exit(0);
  }

  // strict: false lets negative numbers like -7 through instead of being rejected as unknown flags.
  const raw = positionals[0] ?? process.argv.slice(2).find((a) => /^-\d+$/.test(a));

  if (raw === undefined) {
    console.error("Error: please provide an integer.");
    help();
    process.exit(2);
  }

  const n = parseInteger(raw);
  if (n === undefined) {
    console.error(`Error: "${raw}" is not an integer.`);
    process.exit(2);
  }

  console.log(`${n} is ${isEven(n) ? "even" : "odd"}`);
}
