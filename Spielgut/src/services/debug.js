export function createDebug(namespace) {
    return (...args) => {
      if (Deno.env.get("DEBUG") && (Deno.env.get("DEBUG") === "*" || Deno.env.get("DEBUG").includes(namespace))) {
        console.log(`[${namespace}]`, ...args);
      }
    };
  }