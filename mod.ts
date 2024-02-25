// Copyright 2022- TANIGUCHI Masaya
// MIT License https://git.io/mit-license
import { getQuickJS } from "npm:quickjs-emscripten@0.29.0";
import { escapeHtml } from "https://deno.land/x/escape@1.4.2/mod.ts";

export type Template = (globalThis?: Record<string, unknown>) => Promise<string>;
type State = "open" | "close" | "escaped" | "unescaped";

export const compile = (src: string): Template => {
  const tokens = src.split(/(<%[-=]?|%>)/);
  const lines: string[] = ["let __result=''"];
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
        lines.push(`__result+=__atob("${btoa(token)}")`);
        break;
    }
  }
  lines.push("__result");
  const code = lines.join(";\n");
  return async (globalThis: Record<string, unknown> = {}) => {
    const QuickJS = await getQuickJS();
    using vm = QuickJS.newContext();
    using __escape = vm.newFunction("__escape", (str) => (vm.newString(escapeHtml(vm.dump(str)))));
    vm.setProp(vm.global, "__escape", __escape);
    using __atob = vm.newFunction("__atob", (str) => (vm.newString(atob(vm.dump(str)))));
    vm.setProp(vm.global, "__atob", __atob);
    for (const [key, value] of Object.entries(globalThis)) {
      using jsValue = vm.unwrapResult(vm.evalCode(JSON.stringify(value)));
      vm.setProp(vm.global, key, jsValue);
    }
    using result = vm.unwrapResult(vm.evalCode(code));
    return vm.dump(result);
  }
};
