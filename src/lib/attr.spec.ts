import { describe, it, expect } from 'vitest';
import { getValueByPath, selectorFromPath } from './attr';

describe('attr path utilities', () => {
  const ev: any = {
    department: 'Finance',
    resource: 'u1',
    attributes: { channel: 'online', priority: 'normal', docQuality: 'high' },
    attrs: { channel: 'online' },
  };

  it('gets top-level properties', () => {
    expect(getValueByPath(ev, 'department')).toBe('Finance');
  });

  it('gets nested properties', () => {
    expect(getValueByPath(ev, 'attributes.channel')).toBe('online');
  });

  it('falls back to legacy attrs for attributes.* requests', () => {
    const e2: any = { department: 'X', attrs: { channel: 'in-person' } };
    expect(getValueByPath(e2, 'attributes.channel')).toBe('in-person');
  });

  it('selectorFromPath returns a function that stringifies values', () => {
    const sel = selectorFromPath('attributes.priority');
    expect(sel(ev)).toBe('normal');
  });
});

