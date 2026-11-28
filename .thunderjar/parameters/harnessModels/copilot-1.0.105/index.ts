import { copilot } from "thunderjar";

// GitHub Copilot CLI. COPILOT_GITHUB_TOKEN is a GitHub token with Copilot access: a fine-grained
// personal access token with the "Copilot Requests" permission.
// Which models you can use depends on your Copilot plan and your organization's policy. A test
// case may name any model declared here, after the folder, e.g. "copilot-1.0.105/claude-haiku-5.5".
// To run it on OpenRouter, pass `provider: OPENROUTER` too.
export default copilot({
  version: "1.0.105",
  models: {
    "claude-haiku-5.5": [],
    "claude-sonnet-5.5": [],
    "claude-opus-5.5": [],
    "gpt-5.5": [],
  },
});
