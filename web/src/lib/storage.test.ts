import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getHistory,
  getFavorites,
  pushHistory,
  clearHistory,
  isFavorite,
  toggleFavorite,
  removeFavorite,
  clearFavorites,
  subscribe,
  makeId,
} from './storage.js';

const TOOL = 'test-tool';

beforeEach(() => {
  localStorage.clear();
});

describe('makeId', () => {
  it('returns a stable, deterministic id for the same input', () => {
    expect(makeId('hello')).toBe(makeId('hello'));
  });

  it('returns different ids for different inputs', () => {
    expect(makeId('hello')).not.toBe(makeId('hello!'));
  });

  it('coerces non-strings', () => {
    expect(makeId(42)).toBe(makeId('42'));
  });
});

describe('history', () => {
  it('starts empty', () => {
    expect(getHistory(TOOL)).toEqual([]);
  });

  it('pushes entries to the front', () => {
    pushHistory(TOOL, { id: 'a', value: 'A' });
    pushHistory(TOOL, { id: 'b', value: 'B' });
    const list = getHistory(TOOL);
    expect(list.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('dedupes by id, moving the duplicate to the front', () => {
    pushHistory(TOOL, { id: 'a', value: 'A' });
    pushHistory(TOOL, { id: 'b', value: 'B' });
    pushHistory(TOOL, { id: 'a', value: 'A' });
    const list = getHistory(TOOL);
    expect(list.map((e) => e.id)).toEqual(['a', 'b']);
    expect(list).toHaveLength(2);
  });

  it('caps history at 20 entries', () => {
    for (let i = 0; i < 25; i++) pushHistory(TOOL, { id: `id-${i}`, value: String(i) });
    expect(getHistory(TOOL)).toHaveLength(20);
    expect(getHistory(TOOL)[0]?.id).toBe('id-24');
  });

  it('ignores entries without an id', () => {
    pushHistory(TOOL, { value: 'no id' } as unknown as Parameters<typeof pushHistory>[1]);
    pushHistory(TOOL, null);
    expect(getHistory(TOOL)).toEqual([]);
  });

  it('stamps a numeric timestamp', () => {
    pushHistory(TOOL, { id: 'a', value: 'A' });
    expect(typeof getHistory(TOOL)[0]?.ts).toBe('number');
  });

  it('clearHistory empties the list', () => {
    pushHistory(TOOL, { id: 'a', value: 'A' });
    clearHistory(TOOL);
    expect(getHistory(TOOL)).toEqual([]);
  });

  it('returns [] when stored value is malformed JSON', () => {
    localStorage.setItem(`randomizer:history:${TOOL}`, '{not json');
    expect(getHistory(TOOL)).toEqual([]);
  });

  it('returns [] when stored value is not an array', () => {
    localStorage.setItem(`randomizer:history:${TOOL}`, '{"foo":1}');
    expect(getHistory(TOOL)).toEqual([]);
  });
});

describe('favorites', () => {
  it('toggleFavorite adds then removes', () => {
    const entry = { id: 'a', value: 'A' };
    expect(toggleFavorite(TOOL, entry)).toBe(true);
    expect(isFavorite(TOOL, 'a')).toBe(true);
    expect(toggleFavorite(TOOL, entry)).toBe(false);
    expect(isFavorite(TOOL, 'a')).toBe(false);
  });

  it('toggleFavorite returns false for entries without an id', () => {
    expect(toggleFavorite(TOOL, { value: 'x' } as unknown as Parameters<typeof toggleFavorite>[1])).toBe(false);
    expect(toggleFavorite(TOOL, null)).toBe(false);
  });

  it('caps favorites at 100', () => {
    for (let i = 0; i < 105; i++) toggleFavorite(TOOL, { id: `id-${i}`, value: String(i) });
    expect(getFavorites(TOOL)).toHaveLength(100);
  });

  it('removeFavorite removes by id', () => {
    toggleFavorite(TOOL, { id: 'a', value: 'A' });
    toggleFavorite(TOOL, { id: 'b', value: 'B' });
    removeFavorite(TOOL, 'a');
    expect(isFavorite(TOOL, 'a')).toBe(false);
    expect(isFavorite(TOOL, 'b')).toBe(true);
  });

  it('clearFavorites empties the list', () => {
    toggleFavorite(TOOL, { id: 'a', value: 'A' });
    clearFavorites(TOOL);
    expect(getFavorites(TOOL)).toEqual([]);
  });
});

describe('subscribe', () => {
  it('notifies subscribers on history change', () => {
    const fn = vi.fn();
    subscribe(TOOL, fn);
    pushHistory(TOOL, { id: 'a', value: 'A' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on favorite toggle', () => {
    const fn = vi.fn();
    subscribe(TOOL, fn);
    toggleFavorite(TOOL, { id: 'a', value: 'A' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns an unsubscribe fn', () => {
    const fn = vi.fn();
    const off = subscribe(TOOL, fn);
    off();
    pushHistory(TOOL, { id: 'a', value: 'A' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not notify subscribers of other tools', () => {
    const fn = vi.fn();
    subscribe('other-tool', fn);
    pushHistory(TOOL, { id: 'a', value: 'A' });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('write quota failures', () => {
  it('silently ignores localStorage.setItem errors', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(() => pushHistory(TOOL, { id: 'a', value: 'A' })).not.toThrow();
    spy.mockRestore();
  });
});
