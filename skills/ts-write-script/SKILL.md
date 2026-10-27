---
name: ts-write-script
description: By default - use TypeScript to write scripts. 
---


## 1. Include usage block at the top of the file 

<example>

## 2. Do not reference files relative to the current working directory. 

<eg. project structure>

<bad example>

<good example>

### Exception: when referencing a 'path to file' like script parameter - this _should_ be relative to CWD


<example>å


## 3. Make the script a main guard 


In the main block: 

- Verify arguments and if read then call. 

- export the function itself

Rationale: This lends the script functioanlity to be testable


## 4. By default, fail loud and early on missing environment variables or arguments 

## 5. By default, fail loud 