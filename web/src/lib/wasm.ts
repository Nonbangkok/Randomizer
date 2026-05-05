// Singleton accessor for the WASM bridge. Tools call `getWasm()` from inside
// their async actions; the first call lazy-loads + initialises the module
// during requestIdleCallback (or after a 200ms fallback) and every subsequent
// call resolves immediately from the cached promise.

type WasmModule = typeof import('../../pkg/wasm_bridge.js');

let promise: Promise<WasmModule> | undefined;

export function getWasm(): Promise<WasmModule> {
  if (!promise) {
    promise = (async (): Promise<WasmModule> => {
      // Defer until the main thread is idle so the WASM fetch doesn't block
      // first paint or input on slow devices.
      if ('requestIdleCallback' in window) {
        await new Promise<void>((resolve) =>
          window.requestIdleCallback(() => resolve(), { timeout: 8000 }),
        );
      } else {
        await new Promise<void>((resolve) => setTimeout(resolve, 200));
      }
      const mod = await import('../../pkg/wasm_bridge.js');
      await mod.default();
      return mod;
    })();
  }
  return promise;
}

export type { WasmModule };
