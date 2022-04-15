import * as Engine from "https://esm.sh/@engine262/engine262"
import { escapeHtml  } from "https://deno.land/x/escape@1.4.2/mod.ts";

const agent = new Engine.Agent();
Engine.setSurroundingAgent(agent);
const realm = new Engine.ManagedRealm();
realm.scope(()=>{
  const __escape = new Engine.Value(([value]: [any]) => {
    return new Engine.Value(escapeHtml(value.string))
  })
  const __atob = new Engine.Value(([value]: [any]) => {
    return new Engine.Value(atob(value.string))
  })
  Engine.CreateDataProperty(realm.GlobalObject, new Engine.Value('__escape'), __escape)
  Engine.CreateDataProperty(realm.GlobalObject, new Engine.Value('__atob'), __atob)
})

type State = "open" | "close" | "unescaped" | "escaped";

export type Template = (globalThis: any) => string

export const compile = (str: string): Template => {
  const tokens = str.split(/(<%[-=]?|%>)/);
  const lines: string[] = ["let __result=''"];
  let state: State = "close";
  for (const token of tokens) { switch (token) {
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
  const code = lines.join("\n")
  return (globalThis: any) => {
    try {
      realm.scope(()=>{
        for(const [key, value] of Object.entries(globalThis)) {
          Engine.CreateDataProperty(realm.GlobalObject, new Engine.Value(key), new Engine.Value(value))
        }
      })
      return realm.evaluateScript(code).Value.string
    } catch (err) {
      console.log('\n', code)
      throw err
    }
  }
}

console.log(compile("Hello, <%= name %>")({ name: 'Masaya' }))
