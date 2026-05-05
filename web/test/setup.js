// Node 25 ships a built-in `globalThis.localStorage` whose API differs from
// the DOM Storage interface (no `.clear()`, no `.setItem()`). Under Vitest's
// jsdom env, that built-in shadows jsdom's window storage, breaking library
// code and tests. Replace both `globalThis` and `window` storage with a tiny
// Map-backed shim that implements the parts of the Storage interface we use.

class MemoryStorage {
  constructor() { this._data = new Map(); }
  get length() { return this._data.size; }
  key(i) { return Array.from(this._data.keys())[i] ?? null; }
  getItem(k) { return this._data.has(k) ? this._data.get(k) : null; }
  setItem(k, v) { this._data.set(String(k), String(v)); }
  removeItem(k) { this._data.delete(k); }
  clear() { this._data.clear(); }
}

function install() {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: session, configurable: true, writable: true });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: local, configurable: true, writable: true });
    Object.defineProperty(window, 'sessionStorage', { value: session, configurable: true, writable: true });
  }
}

install();
