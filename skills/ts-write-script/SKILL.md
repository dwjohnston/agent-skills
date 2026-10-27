---
name: ts-write-script
description: By default - use TypeScript to write scripts. 
---


## 1. Include usage block at the top of the file 

Example: a script that counts the lines in a file. It uses Node's built-in `parseArgs`, so there is no dependency. Reach for `commander` only when you need subcommands or generated `--help`.

```ts
/**
 * Usage:
 *   bun count-lines.ts <file> [--skip-blank]
 *
 * Arguments:
 *   <file>         Path to a text file (relative to the current directory)
 *
 * Options:
 *   --skip-blank   Do not count empty lines
 *
 * Example:
 *   bun count-lines.ts notes.md --skip-blank
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

export function countLines(text: string, skipBlank = false): number {
  const lines = text.split("\n");
  return skipBlank ? lines.filter((l) => l.trim() !== "").length : lines.length;
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { "skip-blank": { type: "boolean", default: false } },
  });

  const [file] = positionals;
  if (!file) {
    console.error("Missing <file> argument. See the usage block at the top of this script.");
    process.exit(1);
  }

  console.log(countLines(readFileSync(file, "utf8"), values["skip-blank"]));
}
```

The same script with `commander`:

```ts
import { Command } from "commander";

new Command()
  .argument("<file>", "path to a text file")
  .option("--skip-blank", "do not count empty lines")
  .action((file: string, opts: { skipBlank?: boolean }) => {
    console.log(countLines(readFileSync(file, "utf8"), opts.skipBlank));
  })
  .parse();
```

Here `Command` does the argument parsing: it declares the arguments and options, and `.parse()` reads `process.argv`, validates it, and generates `--help`.


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