---
name: github-general
description: General conventions for working with GitHub (issues, pull requests, comments). Use when interacting with GitHub.
---

<!--
🤖
This file was created with AI

Harness: Claude Code
Session Id: session_01LCLeLiFAvaM4X8UPgmvECj
Supervising engineer: dwjohnston

Humans: add your notes here

-->

- Acknowledge the project owner's comments with 👀 emoji

## Always include AI content headers.

`````!!AGENT 

Add a script that the agent can use to generate AI headers. 

It should have two modes 


The script gives a header like this 

```
🤖 <harness>/<model>/<session> 
```

For a cloud session it should be a link. 

`````



## Put all content inside expand blocks. 

Github supports some HTML, notably the `<details>` and `<summary>` tags. 

Put large content blocks into such tags. 


```
<!-- ai header -- > 

<summary>
    <details> <!-- Short description of content --> </details>
    <!-- content here -->
</summary>
```

**Rationale:** Large blocks of AI content are exhausting to see. 

Multiple blocks can be used. 

eg. 
```
<what the problem was>
<how we solved it>
<tests> 
```




