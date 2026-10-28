---
name: ts-write-script
description: By default - use TypeScript to write scripts. 
---


## Endorsed tools

It's up to the user whether these tools should be used. 

- .env files 
  - Bun resolves .env files automatically
  - for node use [dotenv](https://www.npmjs.com/package/dotenv)
- env var validation
  - [envalid](https://www.npmjs.com/package/envalid)
- arguments validation
  - [commander](https://www.npmjs.com/package/commander)


## Script structure

Scripts should be ordered as following

```
<shebang>
<ai content header>
<imports>
<help function>
<constants>
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



## Reference files relative to scripts location

Do not reference files relative to the current working directory. 

**Rationale:** You can't assume that a script will be being executed from a specific location, like the project root. 

Example project structure:

```text
my-project/
  data/
    config.json
  scripts/
    build-report.ts
```

```ts
// 👎 Bad
// scripts/build-report.ts
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync("data/config.json", "utf8"));
```

```ts
// 👍 Good
// scripts/build-report.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const config = JSON.parse(readFileSync(join(import.meta.dirname, "../data/config.json"), "utf8"));
```

### Exception: a path passed as a script argument is relative to the CWD

A path the user types on the command line follows normal shell expectations, so resolve it against the CWD.

```ts
// bun scripts/build-report.ts ./out/report.md
import { resolve } from "node:path";

const outputPath = resolve(process.cwd(), outputArg);
```


## Make the script a runnable module / include a main guard

The main guard block should: 
- Validate environment variables
- Validate script arguments
- Pass these into the main function


The main function itself should be exported 

**Rationale:** This lends the script functioanlity to be testable

```ts
import { parseArgs } from "node:util";
import { cleanEnv, str } from "envalid";


if (import.meta.main) {
  const env = cleanEnv(process.env, { API_TOKEN: str() });

  const { positionals } = parseArgs({ allowPositionals: true });
  const [file] = positionals;
  if (!file) {
    console.error("Missing <file> argument.");
    help();
    process.exit(1);
  }

  main(file, env.API_TOKEN);
}

export function main(file: string, apiToken: string) {
  // ...
}

```

Because `main` is exported and takes plain values, a test can import it and call it directly, without setting environment variables or `process.argv`.


## Declare default values as constants

**Rationale:** Defaults can get lost in default assignements

Declare them in the constants section, between `help` and the main guard.

❌ **Don't:** bury defaults inline, where they're easy to miss and can drift apart.

```ts
export function main(file: string, limit = 100, timeoutMs = 5000) {
  // ...
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { limit: { type: "string" } } });
  main(file, Number(values.limit ?? 100));
}
```

✅ **Do:** name each default once and reference it everywhere.

```ts
const DEFAULT_LIMIT = 100;
const DEFAULT_TIMEOUT_MS = 5000;

export function main(file: string, limit = DEFAULT_LIMIT, timeoutMs = DEFAULT_TIMEOUT_MS) {
  // ...
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { limit: { type: "string" } } });
  main(file, values.limit ? Number(values.limit) : DEFAULT_LIMIT);
}
```

The constants can also be interpolated into `help()`, so the documented default always matches the real one.

## By default, fail loud and early on missing environment variables or arguments 



## 5. By default, fail loud 