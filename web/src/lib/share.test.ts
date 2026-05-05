import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./toast.js', () => ({ showToast: vi.fn() }));

import {
  readParams,
  writeParams,
  encodeText,
  decodeText,
  randomSeed,
  shareButtonHtml,
  copyShareLink,
} from './share.js';
import { showToast } from './toast.js';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('readParams / writeParams', () => {
  it('reads current query string', () => {
    window.history.replaceState(null, '', '/?foo=1&bar=hello');
    const p = readParams();
    expect(p.get('foo')).toBe('1');
    expect(p.get('bar')).toBe('hello');
  });

  it('writes new params via replaceState by default', () => {
    writeParams({ a: '1', b: 'two' });
    expect(window.location.search).toBe('?a=1&b=two');
  });

  it('deletes params when value is null, undefined, empty, or false', () => {
    window.history.replaceState(null, '', '/?keep=1&drop1=x&drop2=y&drop3=z&drop4=w');
    writeParams({ drop1: null, drop2: undefined, drop3: '', drop4: false });
    const p = new URLSearchParams(window.location.search);
    expect(p.get('keep')).toBe('1');
    expect(p.has('drop1')).toBe(false);
    expect(p.has('drop2')).toBe(false);
    expect(p.has('drop3')).toBe(false);
    expect(p.has('drop4')).toBe(false);
  });

  it('coerces values to strings', () => {
    writeParams({ n: 42, b: true });
    const p = new URLSearchParams(window.location.search);
    expect(p.get('n')).toBe('42');
    expect(p.get('b')).toBe('true');
  });

  it('preserves pathname and hash', () => {
    window.history.replaceState(null, '', '/tools/name-generator/#section');
    writeParams({ x: '1' });
    expect(window.location.pathname).toBe('/tools/name-generator/');
    expect(window.location.hash).toBe('#section');
    expect(window.location.search).toBe('?x=1');
  });

  it('uses pushState when replace=false', () => {
    const before = window.history.length;
    writeParams({ a: '1' }, { replace: false });
    expect(window.history.length).toBeGreaterThanOrEqual(before);
    expect(window.location.search).toBe('?a=1');
  });

  it('round-trips through readParams', () => {
    writeParams({ genre: 'fantasy', count: 5 });
    const p = readParams();
    expect(p.get('genre')).toBe('fantasy');
    expect(p.get('count')).toBe('5');
  });
});

describe('encodeText / decodeText', () => {
  it('round-trips ASCII', () => {
    const s = 'hello world';
    expect(decodeText(encodeText(s))).toBe(s);
  });

  it('round-trips multi-line text', () => {
    const s = 'line one\nline two\nline three';
    expect(decodeText(encodeText(s))).toBe(s);
  });

  it('round-trips unicode', () => {
    const s = 'café — 日本語 — 🎲';
    expect(decodeText(encodeText(s))).toBe(s);
  });

  it('produces URL-safe output (no +, /, =)', () => {
    const s = 'a'.repeat(100) + '???>>><<<';
    const encoded = encodeText(s);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('returns "" for empty input on encode', () => {
    expect(encodeText('')).toBe('');
  });

  it('returns null for falsy input on decode', () => {
    expect(decodeText('')).toBe(null);
    expect(decodeText(null)).toBe(null);
    expect(decodeText(undefined)).toBe(null);
  });

  it('returns null for malformed input on decode', () => {
    expect(decodeText('!!!not-base64!!!')).toBe(null);
  });
});

describe('randomSeed', () => {
  it('returns a non-zero u32', () => {
    for (let i = 0; i < 100; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('shareButtonHtml', () => {
  it('uses default label "Share"', () => {
    const html = shareButtonHtml();
    expect(html).toContain('Share link');
    expect(html).toContain('data-share-btn');
  });

  it('respects a custom label', () => {
    expect(shareButtonHtml({ label: 'Copy URL' })).toContain('Copy URL link');
  });
});

describe('copyShareLink', () => {
  it('writes location.href to clipboard and toasts on success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const ok = await copyShareLink();
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(showToast).toHaveBeenCalledWith('Share link copied');
  });

  it('returns false and toasts on failure', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const ok = await copyShareLink();
    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith('Copy failed');
  });
});
