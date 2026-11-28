import { declarePromptSet } from "thunderjar";

// The core-philosophy skill from this repository, at a pinned commit, installed into
// .agents/skills/ (Copilot, Codex, OpenCode) with .claude/skills/ linked to it (Claude Code),
// and committed. To test a newer version of the skill, push it and update the commit.
export default declarePromptSet({
  config: {
    repo: "https://github.com/dwjohnston/agent-skills",
    commit: "b710096ee5344a424735fa775a7bbff72cd6a5c9",
    skill: "core-philosophy",
  },
  applyParameter: (config) => `RUN git clone --quiet ${config.repo} /tmp/agent-skills \\
  && git -C /tmp/agent-skills checkout --quiet --detach ${config.commit} \\
  && mkdir -p /workspace/.agents/skills /workspace/.claude \\
  && cp -r /tmp/agent-skills/skills/${config.skill} /workspace/.agents/skills/ \\
  && ln -s ../.agents/skills /workspace/.claude/skills \\
  && rm -rf /tmp/agent-skills \\
  && cd /workspace && git add -A && git commit --quiet -m "Thunderjar: apply promptSet"`,
});
