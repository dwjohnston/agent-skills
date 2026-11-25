---
name: core-philosophy
description: For setting up new projects, or marking architectural decisions about an application
---



## Get your end to end deployment to production sorted first

- Get your CI servers, deployment strategy, artifact publishing, all of that sorted _first_. 

**Rationale** This stuff is harder than you think, better to get it out the way with first, and then refined as you develop the actual application functionality. 

## Artifact versioning: 

- Semvar
- Use changesets
- 'preview' releases - releases from code that is not yet merged to main, manually triggered with something like a slash-command in a github comment on a PR 
- 'release candidate' releases - a release from what is currently on main 


## CI Metrics

- Measure the time important steps of the pipelines is taking
  - Each individual test
  - Lint, type checking etc. 
- Have these published to a pipeline


**Rationale** You want to see the slow creep up of build times on a chart, get a clear picture of things. 


## No ambient non-determistic behaviour 


**Exception**: Loggers.

- No Date.now(), no Math.random(), no setTimeout(), no .toLocaleString() etc 
  - These _must_ be injected with formal dependency injection 
  - Use a linter to ban these functions, except where they are injected. 

- Prefer pure DI by default. Adopt a DI framework when pure DI becomes painful.
