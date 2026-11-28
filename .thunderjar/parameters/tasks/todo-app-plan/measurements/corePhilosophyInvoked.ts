import { declareMeasurement } from "thunderjar";

// Whether the agent invoked the core-philosophy skill, e.g. through Claude Code's Skill tool.
export default declareMeasurement({
  instrument: "skillInvoked",
  config: { skills: ["core-philosophy"] },
  metrics: { invoked: { score: (v) => v["core-philosophy"], stat: "rate" } },
});
