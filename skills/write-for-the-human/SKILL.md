---
name: write-for-the-human
description: "Conventions for formatting general purpose text intended for human consumption. AGENTS.md, SKILL.md files, output of chat, etc"
---


## Use lists

✅ Use lists, and use nested lists. Multiple levels of list indentation is ok. 

❌ Do not have explainer text follow from the bullet point heading. Instead use one bullet point as the item heading and a nested bullet point for details.


👎 Bad

```markdown

1. **"Commit as you go" instructions** — add the rule to `/workspace/AGENTS.md` so agents don't
   leave uncommitted work behind.
2. **Remove the version-controlled config file** — needs David to name the file; the obvious
   candidates in `thunderjar-meta-repo` are already gitignored, but `ai-experiments` tracks
   `.env` and `settings.local.json` files.
```


👍 Better
```markdown 
1. **"Commit as you go" instructions**
    - add the rule to `/workspace/AGENTS.md`.
2. **Remove the version-controlled config file** 
    - David needs to name the file; the obvious
   candidates in `thunderjar-meta-repo` are already gitignored, but `ai-experiments` tracks
   `.env` and `settings.local.json` files.
```

## Less is more 

AIs tend to over explain things. It's possibly a function of how their reasoning works. 

Err on the side of brevity. If the user needs more details, they will ask for it.

<!-- needs example -->
