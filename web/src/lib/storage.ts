// Client-side persistence for Recent History and Favorites.
// Schema: localStorage keys `randomizer:history:<tool>` and `randomizer:favorites:<tool>`,
// each holding a JSON array of entries. `id` should be a stable, content-derived
// string so dedupe + favorite-toggle work.

export interface StorageEntry {
  id: string;
  ts?: number;
  value: string;
  label?: string;
  meta?: Record<string, unknown>;
}

export type StorageListener = () => void;

const PREFIX = 'randomizer:';
const HISTORY_LIMIT = 20;
const FAVORITES_LIMIT = 100;

function read(key: string): StorageEntry[] {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StorageEntry[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, value: StorageEntry[]): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota / private mode — silently ignore.
  }
}

const listeners = new Map<string, Set<StorageListener>>();

function notify(tool: string): void {
  const set = listeners.get(tool);
  if (set) set.forEach((fn) => fn());
}

export function subscribe(tool: string, fn: StorageListener): () => void {
  let set = listeners.get(tool);
  if (!set) {
    set = new Set();
    listeners.set(tool, set);
  }
  set.add(fn);
  return () => listeners.get(tool)?.delete(fn);
}

export function getHistory(tool: string): StorageEntry[] {
  return read(`history:${tool}`);
}

export function getFavorites(tool: string): StorageEntry[] {
  return read(`favorites:${tool}`);
}

export function pushHistory(tool: string, entry: StorageEntry | null | undefined): void {
  if (!entry || !entry.id) return;
  const list = getHistory(tool).filter((e) => e.id !== entry.id);
  list.unshift({ ...entry, ts: Date.now() });
  if (list.length > HISTORY_LIMIT) list.length = HISTORY_LIMIT;
  write(`history:${tool}`, list);
  notify(tool);
}

export function clearHistory(tool: string): void {
  write(`history:${tool}`, []);
  notify(tool);
}

export function isFavorite(tool: string, id: string): boolean {
  return getFavorites(tool).some((e) => e.id === id);
}

// Returns true if entry is now favorited, false if it was removed.
export function toggleFavorite(tool: string, entry: StorageEntry | null | undefined): boolean {
  if (!entry || !entry.id) return false;
  const list = getFavorites(tool);
  const idx = list.findIndex((e) => e.id === entry.id);
  let nowFavorited: boolean;
  if (idx >= 0) {
    list.splice(idx, 1);
    nowFavorited = false;
  } else {
    list.unshift({ ...entry, ts: Date.now() });
    if (list.length > FAVORITES_LIMIT) list.length = FAVORITES_LIMIT;
    nowFavorited = true;
  }
  write(`favorites:${tool}`, list);
  notify(tool);
  return nowFavorited;
}

export function removeFavorite(tool: string, id: string): void {
  const list = getFavorites(tool).filter((e) => e.id !== id);
  write(`favorites:${tool}`, list);
  notify(tool);
}

export function clearFavorites(tool: string): void {
  write(`favorites:${tool}`, []);
  notify(tool);
}

// Stable string ID via FNV-1a (32-bit). Sufficient for deduping client-side entries.
export function makeId(value: unknown): string {
  const s = String(value);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}
