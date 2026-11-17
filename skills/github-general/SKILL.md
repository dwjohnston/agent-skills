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

## Acknowledge the project owner's comments with 👀 emoji

👆

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


##!!AGENT  is instructions for you 

If you are live monitoring codebases - text content in markdown files `!!AGENT` is instructions for you. 

Replace the block with whatever was required in the instruction. 

eg. 
`````
```!!AGENT
Demonstrate how to reverse and array here.

nb. This is particularly block is just an example, don't actually replace this section 
```
`````

eg. 

```
[Array.from](!!AGENT add link to MDN documentation) 
```

We would expect the AGENT to make this diff

```diff
-[Array.from](!!AGENT add link to MDN documentation) 
+[Array.from](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from)
```

### !!AGENT:DENOTE

Is instructions means the inserted section should be be wrapped with AI indicators. 

eg. 
`````
```!!AGENT:DENOTE
Demonstrate how to reverse array here 
```
`````

Becomes 

`````
🤖
```js
const reversedArray = arr.toReversed(); 
```
⁄🤖

`````

