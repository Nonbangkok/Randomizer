import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStoredTheme, resolveInitialTheme, applyTheme, toggleTheme } from './theme.js';

const KEY = 'randomizer:theme';

function mockMatchMedia(matches: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('getStoredTheme', () => {
  it('returns null when nothing is stored', () => {
    expect(getStoredTheme()).toBe(null);
  });

  it('returns the stored value', () => {
    localStorage.setItem(KEY, 'dark');
    expect(getStoredTheme()).toBe('dark');
  });
});

describe('resolveInitialTheme', () => {
  it('prefers a valid stored theme', () => {
    localStorage.setItem(KEY, 'dark');
    mockMatchMedia(false);
    expect(resolveInitialTheme()).toBe('dark');
  });

  it('falls back to media query when stored value is invalid', () => {
    localStorage.setItem(KEY, 'neon');
    mockMatchMedia(true);
    expect(resolveInitialTheme()).toBe('dark');
  });

  it('uses dark when media query matches and nothing stored', () => {
    mockMatchMedia(true);
    expect(resolveInitialTheme()).toBe('dark');
  });

  it('uses light when media query does not match and nothing stored', () => {
    mockMatchMedia(false);
    expect(resolveInitialTheme()).toBe('light');
  });
});

describe('applyTheme', () => {
  it('sets data-theme on <html> and persists', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(KEY)).toBe('dark');
  });

  it('does not throw if localStorage.setItem fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => applyTheme('light')).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    spy.mockRestore();
  });
});

describe('toggleTheme', () => {
  it('toggles dark -> light', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(toggleTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles light -> dark', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(toggleTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('treats missing attribute as not-dark and goes to dark', () => {
    expect(toggleTheme()).toBe('dark');
  });
});
