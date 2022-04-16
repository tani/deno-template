// Copyright 2022- TANIGUCHI Masaya
// MIT License https://git.io/mit-license

import {
  Agent,
  CreateDataProperty,
  ManagedRealm,
  setSurroundingAgent,
  Value,
} from "https://esm.sh/@engine262/engine262";
import { escapeHtml } from "https://deno.land/x/escape@1.4.2/mod.ts";

type Value = ReturnType<typeof Value>;
type State = "open" | "close" | "unescaped" | "escaped";

export type Template = (globalThis: Record<string, unknown>) => string;

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
        lines.push(`__result+=eval(__atob("${btoa(token)}"))`);
        break;
      case "escaped":
        lines.push(`__result+=__escape(eval(__atob("${btoa(token)}")))`);
        break;
      case "close":
        lines.push(`__result+=__atob("${btoa(token)}")`);
        break;
    }
  }
  const code = lines.join("\n");
  return (globalThis: Record<string, unknown>) => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    realm.scope(() => {
      function unwrap(value: Value) {
        const json = realm.Intrinsics["%JSON%"];
        const stringify = json.properties.map.get("stringify").Value;
        return JSON.parse(stringify.nativeFunction([value]).string);
      }
      function wrap(value: unknown) {
        if (typeof value === "function") {
          return new Value((args: Value[]) => {
            return new Value(value(...args.map(unwrap)));
          });
        }
        return new Value(value);
      }
      CreateDataProperty(
        realm.GlobalObject,
        wrap("__escape"),
        wrap(escapeHtml),
      );
      CreateDataProperty(
        realm.GlobalObject,
        wrap("__atob"),
        wrap(atob)
      );
      for (const [key, value] of Object.entries(globalThis)) {
        CreateDataProperty(
          realm.GlobalObject,
          wrap(key),
          wrap(value)
        );
      }
    });
    const result = realm.evaluateScript(code);
    if ("Value" in result && "string" in result.Value) {
      return result.Value.string;
    }
    const message = result.Value.properties.map.get("message").Value.string;
    throw Error(message);
  };
};
