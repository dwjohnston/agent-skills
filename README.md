# agent-skills

Agent skills I use across projects.

## Install

### Claude Code plugin

All the skills come as one plugin, `dwjohnston-skills`.

- In a Claude Code session:
  ```text
  /plugin install dwjohnston-skills --marketplace dwjohnston/agent-skills
  ```
- Or from the shell:
  ```bash
  claude plugin marketplace add dwjohnston/agent-skills
  claude plugin install dwjohnston-skills@dwjohnston-agent-skills
  ```
- Skills are then named with the plugin's prefix, e.g. `/dwjohnston-skills:markdown-general`.
- Update with `claude plugin update dwjohnston-skills@dwjohnston-agent-skills`.

### Copy the skills into a project

```bash
npx skills add dwjohnston/agent-skills
```

Or a single skill:

```bash
npx skills add dwjohnston/agent-skills@markdown-general
```

## Skills

| Skill | Purpose |
|---|---|
| [markdown-general](skills/markdown-general/SKILL.md) | Style guidelines for Markdown written for human readers. |
| [markdown-writing-markdown-blocks](skills/markdown-writing-markdown-blocks/SKILL.md) | Nesting fenced code blocks inside Markdown examples. |
| [markdown-writing-prompts](skills/markdown-writing-prompts/SKILL.md) | Conventions for human-readable SKILL.md and AGENTS.md files. |
| [github-actions-docs-and-changesets](skills/github-actions-docs-and-changesets/SKILL.md) | Changesets + GitHub Actions npm release pipeline with VitePress docs. |
| [github-general](skills/github-general/SKILL.md) | General conventions for working with GitHub. Boilerplate. |
| [subagents-general](skills/subagents-general/SKILL.md) | Conventions for spawning and briefing subagents. Boilerplate. |
| [write-for-the-human](skills/write-for-the-human/SKILL.md) | List-led formatting for text humans read: chat output, AGENTS.md, SKILL.md. |
