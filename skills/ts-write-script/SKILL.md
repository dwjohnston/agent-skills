---
name: ts-write-script
description: By default, use TypeScript to write scripts that are testable, explicit about inputs, and fail clearly when something goes wrong.
---

## Usage

Show how to run the script near the top of the file. Include required arguments and environment variables, and say what paths are relative to the current working directory (CWD).

```sh
API_TOKEN=your-token npx tsx ./scripts/import-records.ts ./data/records.json
```

In this example, the script path and input file path are resolved from the directory where the command is run.

## 1. Include a usage block

Make the command easy to copy, and document required inputs and expected output. If arguments are optional, show their defaults. For scripts with several options, include a short help example.

✅ **Do this:** Show a representative invocation and explain its arguments.

❌ **Don't do this:** Leave users to infer how to invoke the script from its implementation.

**Rationale:** A usage block makes scripts discoverable and helps users avoid invalid invocations.

## 2. Resolve script-owned files independently of the CWD

Do not open a file bundled with the script using a bare relative path. The CWD changes depending on how the script is launched.

❌ **Don't do this:**

```ts
import { readFile } from "node:fs/promises";

const defaults = await readFile("./config/defaults.json", "utf8");
```

✅ **Do this:**

```ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const defaultsPath = fileURLToPath(new URL("./config/defaults.json", import.meta.url));
const defaults = await readFile(defaultsPath, "utf8");
```

Resolve resources relative to `import.meta.url` (or use the equivalent for the script's module system). This keeps them findable even when the script is launched from another directory.

### Exception: paths supplied by the user

Treat a path argument as relative to the CWD unless the CLI explicitly documents another base. This matches normal command-line expectations.

```ts
import { resolve } from "node:path";

const inputPath = resolve(process.cwd(), inputArgument);
```

Do not resolve a user-supplied path relative to the script file by accident.

## 3. Put executable work behind a main guard

Export the useful function, and invoke it only when the file is run directly. This lets tests and other modules import the function without triggering the CLI.

```ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function loadRecords(filePath: string): Promise<unknown[]> {
  const contents = await readFile(filePath, "utf8");
  const records: unknown = JSON.parse(contents);

  if (!Array.isArray(records)) {
    throw new Error(`Expected an array in ${filePath}`);
  }

  return records;
}

async function main(): Promise<void> {
  const [inputArgument, ...extraArguments] = process.argv.slice(2);
  if (!inputArgument || extraArguments.length > 0) {
    throw new Error("Usage: npx tsx ./scripts/import-records.ts <input-file>");
  }

  const inputPath = resolve(process.cwd(), inputArgument);
  const records = await loadRecords(inputPath);
  console.log(`Loaded ${records.length} records from ${inputPath}`);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(resolve(invokedPath)).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
```

Use the module system and direct-execution check supported by the project’s runtime. Keep the same behavior: imports should expose functionality without running the CLI, while direct execution should validate inputs and report failures with a non-zero exit status.

**Rationale:** A main guard separates reusable logic from command-line behavior and makes the script straightforward to test.

## 4. Fail early when required inputs are missing

Validate required arguments and environment variables before doing work. Name the missing input in the error.

```ts
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const apiToken = requiredEnv("API_TOKEN");
```

Use a project’s existing configuration or validation helper when one is available. Do not silently substitute an empty string, dummy credential, or undocumented default for a required value.

## 5. Fail loudly and preserve useful errors

Let unexpected failures surface. Add context when it helps users diagnose the problem, and keep the original cause when wrapping an error.

✅ **Do this:** Report the error and set a failing exit code at the CLI boundary, as in the main-guard example.

❌ **Don't do this:**

```ts
try {
  await doWork();
} catch {
  return [];
}
```

Avoid empty catch blocks, success-shaped fallback values, and broad catches that hide failures. Handle an error only when the script can recover meaningfully or can add useful context; otherwise, report it and exit unsuccessfully.
