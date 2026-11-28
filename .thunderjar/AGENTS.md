# .thunderjar

Thunderjar's configuration for this project: parameters in `parameters/`, and the test cases that combine them in `test-cases/`.

## Defaults for new test cases

Use these when writing a new test case, unless the user asks for something else. Write each value into the test case: they're never applied at run time.

- baseImage: node20
- promptSet: snerk
- harnessModel, for a first run: claude-code / claude-haiku-5-5
- harnessModel, to compare harnesses: claude-code / claude-haiku-5-5, copilot / claude-haiku-5.5, opencode / opencode/claude-haiku-5-5
- iterations, for a first run: 1
- iterations, to compare: 5

A harness is named without its version: use the newest version of it in `parameters/harnessModels/`, e.g. `claude-code-2.1.311/claude-haiku-5-5`.

There's no default code state. A test case starts where the task needs it to, so choose one each time.

## Running on Fly.io

Set `THUNDERJAR_REMOTE=1` to run containers on a Fly machine instead of the local Docker daemon. It needs `FLYIO_TOKEN`, the `fly` CLI, `THUNDERJAR_DB_URL` (or `THUNDERJAR_RUN_DATA=sqlite`), and a `docker login ghcr.io` that can push.

`fly-client/` is copied from the Thunderjar repository's `.thunderjar/fly-client/`. It manages the one Fly machine remote runs use: it creates it, starts it, and stops it when idle. Every `docker` command Thunderjar runs goes through it.

```sh
bun .thunderjar/fly-client/index.ts <up | docker <args…> | stop [--force] | destroy [--force] | status [--json] | prune>
```

- The machine is in `FLY_APP`, `thunderjar-runtime-dwj` by default: the same one the Thunderjar repository uses.
- It stops after `FLY_SLEEP_MINUTES` idle (30 by default), and is destroyed after `FLY_DESTROY_MINUTES` (a week).
- Tests: `bun run test:fly`, with fake `fly`, `docker` and `ssh`.
