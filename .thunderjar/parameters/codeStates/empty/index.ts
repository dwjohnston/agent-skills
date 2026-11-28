import { declareCodeState } from "thunderjar";

// An empty git repository, for tasks that start a new project from nothing.
export default declareCodeState({
  applyParameter: () => `RUN mkdir -p /workspace \\
  && git -C /workspace init --quiet \\
  && git -C /workspace commit --quiet --allow-empty -m "Empty project"
WORKDIR /workspace`,
});
