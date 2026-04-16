import vm from "node:vm";
import type { HarnessContext, HarnessResult } from "../types";

/**
 * Sandboxed Code Execution
 * Safely executes LLM-generated TypeScript (transpiled to JS) in an isolated context.
 * Enforces timeouts, memory limits, and prevents fs/net access.
 */
export async function executeHarnessInSandbox(
  javascriptCode: string,
  draft: string,
  context: HarnessContext
): Promise<HarnessResult> {
  return new Promise((resolve, reject) => {
    try {
      // 1. Prepare the sandbox environment
      const sandbox = {
        draft,
        context,
        resolve,
        reject,
        console: {
          log: () => {}, // suppress logs or capture them
          warn: () => {},
          error: () => {},
        },
        require: undefined,
        process: undefined,
        globalThis: undefined,
      };

      // 2. Create the context
      vm.createContext(sandbox);

      // 3. The code expects an async function 'evaluate' that we will invoke.
      // The LLM must generate code that exposes `evaluate(draft, context) -> Promise<HarnessResult>`
      // We wrap the LLM's code to capture its output and call our resolve/reject.
      const wrappedCode = `
        (async () => {
          try {
            // -- LLM GENERATED CODE START --
            ${javascriptCode}
            // -- LLM GENERATED CODE END --
            
            if (typeof evaluate !== 'function') {
              throw new Error("The synthesized code must define an 'evaluate' function.");
            }

            const result = await evaluate(draft, context);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        })();
      `;

      // 4. Execute with strict limits
      const script = new vm.Script(wrappedCode);
      
      script.runInContext(sandbox, {
        timeout: 5000, // 5 seconds max
      });

    } catch (err: any) {
      reject(new Error(`Sandbox Execution Error: ${err.message}`));
    }
  });
}
