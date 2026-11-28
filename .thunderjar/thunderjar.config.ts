import { declareConfig, postgresStore, sqliteStore } from "thunderjar";

// Set THUNDERJAR_REMOTE=1 to run on Fly.io, with images in ghcr. Without it, everything stays on
// this machine. With THUNDERJAR_RUN_DATA=sqlite as well, a remote run records its data in the local
// SQLite file instead of Postgres: for machines that can't reach Postgres.
const remote = Bun.env.THUNDERJAR_REMOTE === "1";
const localRunData = Bun.env.THUNDERJAR_RUN_DATA === "sqlite";
const sqlite = sqliteStore({ path: "./.thunderjar/.data/runs.sqlite" });

// How many containers run at once on the Fly machine: its CPUs, FLYIO_INSTANCE_SIZE (which the Fly
// client sizes it to), times CONCURRENCY_RATIO.
const positive = (name: string, fallback: number): number => {
  const value = Number(Bun.env[name] || fallback);
  if (!(value > 0)) throw new Error(`${name} must be a positive number, got '${Bun.env[name]}'`);
  return value;
};
const remoteConcurrency = Math.max(1, Math.round(positive("FLYIO_INSTANCE_SIZE", 16) * positive("CONCURRENCY_RATIO", 2)));

export default declareConfig(
  remote
    ? {
      // Prerun images are built on the Fly machine and pushed here from it, as are postrun images.
      // Needs `docker login ghcr.io` with a token that can write packages.
      imageStore: { repository: Bun.env.THUNDERJAR_IMAGE_REPOSITORY || "ghcr.io/dwjohnston/thunderjar-images" },
      runDataStore: localRunData ? sqlite : postgresStore({ urlEnv: "THUNDERJAR_DB_URL" }),
      // Containers run on a Docker daemon on the Fly machine in FLY_APP. Every docker command goes
      // through the Fly client, which creates and starts the machine when needed, and stops it when
      // idle. See fly-client/ and .thunderjar/AGENTS.md. Needs FLYIO_TOKEN and the `fly` CLI.
      runtime: {
        command: ["bun", "./.thunderjar/fly-client/index.ts", "docker"],
        concurrency: remoteConcurrency,
      },
      build: { concurrency: remoteConcurrency },
    }
    : {
      // Images stay in the local Docker daemon, and runs are recorded in a local file.
      imageStore: null,
      runDataStore: sqlite,
    },
);
