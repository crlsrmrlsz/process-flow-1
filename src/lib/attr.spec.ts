import { describe, it, expect } from 'vitest';
import { getValueByPath, selectorFromPath } from './attr';

describe('attr path utilities', () => {
  const ev: any = {
    resource: 'u1',
  };

  it('gets top-level properties', () => {
    expect(getValueByPath(ev, 'resource')).toBe('u1');
  });

  it('selectorFromPath returns a function that stringifies values', () => {
    const sel = selectorFromPath('resource');
    expect(sel(ev)).toBe('u1');
  });
});
