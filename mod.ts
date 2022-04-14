import Sval from "https://cdn.skypack.dev/sval@0.4.8";

type State = "open" | "close" | "value";

export type Template = (globalThis: any) => string

export const compile = (str: string): Template => {
  const tokens = str.split(/(<%-?|%>)/);
  const lines: string[] = ["let __result=''"];
  let state: State = "close";
  for (const token of tokens) {
    switch (token) {
      case "<%":
        state = "open";
        continue;
      case "<%-":
        state = "value";
        continue;
      case "%>":
        state = "close";
        continue;
    }
    switch (state) {
      case "open":
      lines.push(token);
      break;
      case "value":
      lines.push(`__result+=(${token})`);
      break;
      case "close":
      lines.push(`__result+=atob("${btoa(token)}")`);
      break;
    }
  }
  lines.push(`exports.result = __result`);
  const code = lines.join(";\n")
  return (globalThis: any) => {
    try {
      const interpreter = new Sval()
      interpreter.import(globalThis)
      interpreter.run(code)
      return interpreter.exports.result
    } catch (err) {
      console.log('\n', code)
      throw err
    }
  }
}
