// Copyright 2022- TANIGUCHI Masaya
// MIT License https://git.io/mit-license

import Sval from "https://esm.sh/sval@v0.4.8?bundle&no-check";
import { escapeHtml } from "https://deno.land/x/escape@1.4.2/mod.ts";

export type Template = (globalThis: Record<string, unknown>) => Promise<string>;
type State = "open" | "close" | "escaped" | "unescaped";

export const compile = (src: string): Template => {
  const tokens = src.split(/(<%[-=]?|%>)/);
  const lines: string[] = ["(async () => {", "let __result=''"];
  let state: State = "close";
  for (const token of tokens) {
    switch (token) {
      case "<%":
        state = "open";
        continue;
      case "<%-":
        state = "unescaped";
        continue;
      case "<%=":
        state = "escaped";
        continue;
      case "%>":
        state = "close";
        continue;
    }
    switch (state) {
      case "open":
        lines.push(token);
        break;
      case "unescaped":
        lines.push(`__result+=${token}`);
        break;
      case "escaped":
        lines.push(`__result+=__escape(${token})`);
        break;
      case "close":
        lines.push(`__result+=atob("${btoa(token)}")`);
        break;
    }
  }
  lines.push("__resolve(__result)", "})()");
  const code = lines.join(";\n");
  return (globalThis: Record<string, unknown>) =>
    new Promise((resolve) => {
      const js = new Sval();
      js.import(globalThis);
      js.import({
        __resolve: resolve,
        __escape: escapeHtml,
      });
      try {
        js.run(code);
      } catch (err) {
        console.error(code);
        throw err;
      }
    });
};
