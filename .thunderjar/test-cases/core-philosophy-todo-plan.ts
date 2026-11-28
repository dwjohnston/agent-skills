import { declareTestCase } from "thunderjar";

// Does the agent read the core-philosophy skill when asked to plan a new project?
// Haiku, Sonnet and Opus 5.5, each in Claude Code and GitHub Copilot CLI.
// Needs CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY, and COPILOT_GITHUB_TOKEN.
export default declareTestCase({
  baseImage: ["node20"],
  codeState: ["empty"],
  promptSet: ["core-philosophy"],
  harnessModel: [
    "claude-code-2.1.311/claude-haiku-5-5",
    "claude-code-2.1.311/claude-sonnet-5-5",
    "claude-code-2.1.311/claude-opus-5-5",
    "copilot-1.0.105/claude-haiku-5.5",
    "copilot-1.0.105/claude-sonnet-5.5",
    "copilot-1.0.105/claude-opus-5.5",
  ],
  task: "todo-app-plan",
  initialPrompt: ["plain"],
  iterations: 1,
});
