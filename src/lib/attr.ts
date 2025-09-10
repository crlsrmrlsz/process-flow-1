import type { EventLogEvent } from '@/types';

// Safely read nested property by path like "department" or "attributes.channel" or legacy "attrs.channel".
export function getValueByPath(ev: EventLogEvent, path: string): unknown {
  const parts = path.split('.');
  let cur: any = ev as any;
  for (const key of parts) {
    if (cur == null) return undefined;
    // support legacy alias: if path asks for attributes.something but only attrs exists
    if (key === 'attributes' && cur.attributes == null && cur.attrs != null) {
      cur = cur.attrs;
      continue;
    }
    cur = cur[key];
  }
  return cur;
}

export function selectorFromPath(path: string): (ev: EventLogEvent) => string | undefined {
  return (ev) => {
    const v = getValueByPath(ev, path);
    if (v == null) return undefined;
    return String(v);
  };
}

