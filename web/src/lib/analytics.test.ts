import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as analytics from './analytics.js';

beforeEach(() => {
  delete window.gtag;
  delete window.dataLayer;
});

describe('module exports', () => {
  it('exports trackEvent and initGA', () => {
    expect(typeof analytics.trackEvent).toBe('function');
    expect(typeof analytics.initGA).toBe('function');
  });
});

describe('trackEvent', () => {
  it('is a no-op when gtag is not loaded', () => {
    expect(() => analytics.trackEvent('foo', { tool: 't' })).not.toThrow();
  });

  it('forwards to window.gtag with merged params + timestamp', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    analytics.trackEvent('generate_name', { tool: 'name-generator' });
    expect(gtag).toHaveBeenCalledTimes(1);
    const call = gtag.mock.calls[0]!;
    expect(call[0]).toBe('event');
    expect(call[1]).toBe('generate_name');
    const params = call[2] as Record<string, unknown>;
    expect(params['tool']).toBe('name-generator');
    expect(typeof params['timestamp']).toBe('number');
  });

  it('defaults params to an empty object', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    analytics.trackEvent('ping');
    expect(gtag).toHaveBeenCalled();
    const params = gtag.mock.calls[0]![2] as Record<string, unknown>;
    expect(typeof params['timestamp']).toBe('number');
  });

  it('does not call gtag if it is not a function', () => {
    (window as unknown as { gtag: unknown }).gtag = 'not a function';
    expect(() => analytics.trackEvent('foo')).not.toThrow();
  });
});

describe('initGA', () => {
  it('is a no-op if gtag is already defined', () => {
    const existing = vi.fn();
    window.gtag = existing;
    analytics.initGA();
    expect(window.gtag).toBe(existing);
  });
});
