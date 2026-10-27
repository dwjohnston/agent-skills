---
name: ts-write-script
description: By default - use TypeScript to write scripts. 
---


## 1. Include a `usage` function at the top of the file

Write usage as a function that logs a string, placed above the logic. It does two jobs: it documents the script for whoever reads the file, and it is what the script prints for `--help` or when arguments are wrong.

Example: a script that counts the lines in a file. It uses Node's built-in `parseArgs`, so there is no dependency.

```ts
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

function usage() {
  console.log(`
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

export function countLines(text: string, skipBlank = false): number {
  const lines = text.split("\n");
  return skipBlank ? lines.filter((l) => l.trim() !== "").length : lines.length;
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "skip-blank": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    usage();
    process.exit(0);
  }

  const [file] = positionals;
  if (!file) {
    console.error("Missing <file> argument.");
    usage();
    process.exit(1);
  }

  console.log(countLines(readFileSync(file, "utf8"), values["skip-blank"]));
}
```

If you use `commander` instead, its `Command` parses `process.argv` and generates `--help` itself, so the hand-written `usage` is not needed.


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