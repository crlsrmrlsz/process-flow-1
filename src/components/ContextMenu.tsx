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
  const { ctxMenu, graph, closeCtxMenu, decoupleByDepartment } = useFlowStore((s) => ({
    ctxMenu: s.ctxMenu,
    graph: s.graph,
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
        canDecoupleDept = (e.uniqueDepartments ?? 0) >= 2;
        canDecouplePerson = (e.uniqueResources ?? 0) >= 2;
        canShowCases = e.count > 0;
      }
    } else if (t.type === 'node') {
      const outs = outgoing(t.id);
      const depSet = new Set<string>();
      const resSet = new Set<string>();
      for (const e of outs) {
        // fallback to traversals if uniques absent
        if (e.uniqueDepartments != null || e.uniqueResources != null) {
          if (e.uniqueDepartments && e.uniqueDepartments > 0) depSet.add('present');
          if (e.uniqueResources && e.uniqueResources > 0) resSet.add('present');
        } else {
          for (const tr of e.traversals) {
            // no department on traversal; rely on edge uniques in Phase 1 data
          }
        }
      }
      // enable if sum across outs implies at least 2 unique categories overall
      canDecoupleDept = depSet.size >= 2; // conservatively false in Phase 1 sample
      // For person, detect by checking whether multiple edges report any resource presence.
      // Phase 1 sample likely has multiple resources across outs from 'A'.
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
