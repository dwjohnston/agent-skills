---
name: ts-write-script
description: By default - use TypeScript to write scripts. 
---


## Script structure

Scripts should be ordered as following

```
<shebang>
<ai content header>
<imports>
<help function>
<main guard>
<main function>
<associated functions>
```

## Include a `help` function at the top of the file
At the top of the file, below the imports, add a function that serves to describe what the function does, and its usage. 

This does two jobs: it documents the script for whoever reads the file, and it is what the script prints for `--help` or when arguments are wrong. 

```ts
#!/usr/bin/env bun
// AI-generated: written by Copilot, reviewed by a human? (edit to match your convention)
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

function help() {
  console.log(`
Count the lines in a text file and print the total to stdout.
Blank lines are included unless --skip-blank is passed.

Usage:
  bun count-lines.ts <file> [--skip-blank]

Arguments:
  <file>         Path to a text file (relative to the current directory)

Options:
  --skip-blank   Do not count empty lines
  -h, --help     Show this message

Example:
  bun count-lines.ts notes.md --skip-blank
`);
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "skip-blank": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const [file] = positionals;

  if (values.help) {
    help();
    process.exit(0);
  }
  if (!file) {
    console.error("Missing <file> argument.");
    help();
    process.exit(1);
  }

  main(file, values["skip-blank"]);
}

export function main(file: string, skipBlank = false) {
  console.log(countLines(readFileSync(file, "utf8"), skipBlank));
}

export function countLines(text: string, skipBlank = false): number {
  const lines = text.split("\n");
  return skipBlank ? lines.filter((l) => l.trim() !== "").length : lines.length;
}
```

The main guard only parses and validates arguments, then calls `main`. `help()` runs for `--help` (exit 0) or bad usage (exit 1). Function declarations are hoisted, so `main` can sit below the guard.

If you use `commander` instead, its `Command` parses `process.argv` and generates `--help` itself, so the hand-written `help` is not needed.


## 2. Do not reference files relative to the current working directory. 

<eg. project structure>

<bad example>

<good example>

### Exception: when referencing a 'path to file' like script parameter - this _should_ be relative to CWD


<example>å


## 3. Make the script a main guard 


In the main block: 

- Verify arguments and if read then call. 

- export the function itself

Rationale: This lends the script functioanlity to be testable


## 4. By default, fail loud and early on missing environment variables or arguments 

## 5. By default, fail loud 