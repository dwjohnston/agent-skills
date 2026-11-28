import { declareInitialPrompt, writePrompt } from "thunderjar";

export default declareInitialPrompt({
  applyParameter: () => writePrompt("Create a plan to create a Todo List web app using TypeScript"),
  timeoutSeconds: 900,
});
