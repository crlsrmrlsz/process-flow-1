import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFlowStore } from '@/state/store';

type MenuItem = {
  key: string;
  label: string;
  enabled: boolean;
  onSelect?: () => void; // not wired yet in Milestone 3
};

export function ContextMenu() {
  const { ctxMenu, graph, events, closeCtxMenu, decoupleByDepartment } = useFlowStore((s) => ({
    ctxMenu: s.ctxMenu,
    graph: s.graph,
    events: s.events,
    closeCtxMenu: s.closeCtxMenu,
    decoupleByDepartment: s.decoupleByDepartment,
  }));

  const menuRef = useRef<HTMLDivElement | null>(null);

  const items: MenuItem[] = useMemo(() => {
    if (!ctxMenu.open || !ctxMenu.target || !graph) return [];
    const t = ctxMenu.target;

    // Helpers
    const outgoing = (nodeId: string) => graph.edges.filter((e) => e.source === nodeId);
    const edgeById = (id: string) => graph.edges.find((e) => e.id === id);

    let canDecoupleDept = false;
    let canDecouplePerson = false;
    let canCollapse = false;
    let canExpand = false; // reserved for collapsed meta-nodes in future milestones
    let canShowCases = false;

    if (t.type === 'edge') {
      const e = edgeById(t.id);
      if (e) {
        // Use traversals to count distinct departments/resources, if available
        const deptSet = new Set<string>();
        const resSet = new Set<string>();
        for (const tr of e.traversals) {
          if ((tr as any).department) deptSet.add((tr as any).department as string);
          if ((tr as any).resource) resSet.add((tr as any).resource as string);
        }
        canDecoupleDept = deptSet.size >= 2 || (e.uniqueDepartments ?? 0) >= 2;
        canDecouplePerson = resSet.size >= 2 || (e.uniqueResources ?? 0) >= 2;
        canShowCases = e.count > 0;
      }
    } else if (t.type === 'node') {
      const outs = outgoing(t.id);
      const depSet = new Set<string>();
      const resSet = new Set<string>();
      // Use the events to detect real distinct departments/resources handling this node
      for (const ev of events) {
        if (ev.activity === t.id) {
          if (ev.department) depSet.add(ev.department);
          if (ev.resource) resSet.add(ev.resource);
        }
      }
      canDecoupleDept = depSet.size >= 2;
      canDecouplePerson = resSet.size >= 2;
      canCollapse = outs.length > 0;
      // Show cases here if node has any incident edges
      canShowCases = graph.edges.some((e) => e.source === t.id || e.target === t.id);
    }

    return [
      { key: 'dept', label: 'Decouple by Department', enabled: canDecoupleDept },
      { key: 'person', label: 'Decouple by Person', enabled: canDecouplePerson },
      { key: 'collapse', label: 'Collapse Following Transitions', enabled: t.type === 'node' && canCollapse },
      { key: 'expand', label: 'Expand', enabled: canExpand },
      { key: 'cases', label: 'Show cases here', enabled: canShowCases },
    ];
  }, [ctxMenu.open, ctxMenu.target, graph]);

  useEffect(() => {
    if (!ctxMenu.open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeCtxMenu();
    }
    function onClick(e: MouseEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        closeCtxMenu();
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [ctxMenu.open, closeCtxMenu]);

  useEffect(() => {
    if (!ctxMenu.open) return;
    // focus first enabled item when menu opens
    const el = menuRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLButtonElement>('button:not([disabled])');
    first?.focus();
  }, [ctxMenu.open]);

  if (!ctxMenu.open || !ctxMenu.pos) return null;

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context menu"
      className="fixed z-50 min-w-[220px] rounded-md border border-zinc-700 bg-zinc-800 shadow-lg p-1"
      style={{ left: ctxMenu.pos.x, top: ctxMenu.pos.y }}
      data-testid="context-menu"
    >
      {items.map((it) => (
        <button
          key={it.key}
          role="menuitem"
          disabled={!it.enabled}
          className={`w-full text-left px-3 py-1.5 rounded text-sm ${
            it.enabled
              ? 'text-zinc-100 hover:bg-zinc-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-400'
              : 'text-zinc-500 cursor-not-allowed'
          }`}
          onClick={() => {
            if (!it.enabled || !ctxMenu.target) return;
            if (it.key === 'dept') {
              decoupleByDepartment(ctxMenu.target);
            }
            // Other actions wired in later milestones
            closeCtxMenu();
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );

  return createPortal(menu, document.body);
}
