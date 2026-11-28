import { declareMeasurement } from "thunderjar";

// Whether the agent read the core-philosophy skill's SKILL.md with a read tool or a shell command,
// e.g. a harness that loads skills by reading the file rather than through a skill tool.
export default declareMeasurement({
  instrument: "fileRead",
  config: { paths: ["**/core-philosophy/SKILL.md"] },
  metrics: { read: { score: (v) => v["**/core-philosophy/SKILL.md"], stat: "rate" } },
});
