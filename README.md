# Fuki - ejs in sandbox

This is a tiny template library for Node/ Deno projects.
Most of ejs flavored template engine depend on `eval` or `Function`.
However, this is a problematic for non-standard JavaScript runtime such as Deno Deploy.
Thus, we enables `eval` using a sandbox Javascript interpreter written in JavaScript.
It might be slower than other templating library. Anyway, enjoy ejs template ;)

## Usage 

```js
import { compile } from "https://pax.deno.dev/tani/fuki"
const name = "John"
const template = compile("<% for (let i = 0; i < 10; i++) { %> Hi, <%- name %>! <% } %>")
console.log(await template({ name })
```
