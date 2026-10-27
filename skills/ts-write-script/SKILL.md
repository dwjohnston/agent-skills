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

```

### Alternative: `commander`

With `commander`, the `Command` block replaces both `help` and the argument parsing. Its description, arguments and options become the `--help` output, and it rejects bad usage for you.

```ts
import { Command } from "commander";

if (import.meta.main) {
  new Command()
    .description("Count the lines in a text file and print the total to stdout.")
    .argument("<file>", "path to a text file (relative to the current directory)")
    .option("--skip-blank", "do not count empty lines")
    .addHelpText("after", "\nExample:\n  bun count-lines.ts notes.md --skip-blank")
    .action((file: string, opts: { skipBlank?: boolean }) => main(file, opts.skipBlank))
    .parse();
}
```





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