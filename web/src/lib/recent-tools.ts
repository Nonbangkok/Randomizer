// Tracks the user's most recently visited tools across pages.
// Lives in its own localStorage key so it stays decoupled from per-tool
// history (see storage.ts). The home page reads this to render a
// "Recently used" rail above the full tool grid.

const KEY = 'randomizer:recent-tools';
const LIMIT = 4;

export interface RecentEntry {
  key: string;
  ts: number;
}

function read(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentEntry =>
        !!e &&
        typeof (e as RecentEntry).key === 'string' &&
        typeof (e as RecentEntry).ts === 'number',
    );
  } catch {
    return [];
  }
}

function write(list: RecentEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Quota / private mode — silently ignore.
  }
}

export function recordVisit(key: string): void {
  if (!key || key === 'home' || key === 'blog') return;
  const next = read().filter((e) => e.key !== key);
  next.unshift({ key, ts: Date.now() });
  if (next.length > LIMIT) next.length = LIMIT;
  write(next);
}

export function getRecent(): RecentEntry[] {
  return read();
}

export function clearRecent(): void {
  write([]);
}
