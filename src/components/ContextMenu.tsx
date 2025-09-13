import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFlowStore } from '@/state/store';
// Context menu logic is node-local; no downstream propagation awareness.

type MenuItem = {
  key: string;
  label: string;
  enabled: boolean;
  onSelect?: () => void; // not wired yet in Milestone 3
};

export function ContextMenu() {
  const { ctxMenu, graph, events, decouples, expanded, expandAllFrom, collapseNode, closeCtxMenu, decoupleByPath, undoDecoupleByPathDownstream } = useFlowStore((s) => ({
    ctxMenu: s.ctxMenu,
    graph: s.graph,
    events: s.events,
    decouples: s.decouples,
    expanded: s.expanded,
    expandAllFrom: s.expandAllFrom,
    collapseNode: s.collapseNode,
    closeCtxMenu: s.closeCtxMenu,
    decoupleByPath: s.decoupleByPath,
    undoDecoupleByPathDownstream: s.undoDecoupleByPathDownstream,
  }));

  const menuRef = useRef<HTMLDivElement | null>(null);

  const items: MenuItem[] = useMemo(() => {
    if (!ctxMenu.open || !ctxMenu.target || !graph) return [];
    const t = ctxMenu.target;

    // Helpers
    const outgoing = (nodeId: string) => graph.edges.filter((e) => e.source === nodeId);
    const conceptPath = {
      person: 'resource',
    } as const;
    const nodeAffectedByConcept = (nodeId: string, path: string) => decouples.some((l) => l.path === path && l.target.type === 'node' && l.target.id === nodeId);

    let canDecouplePerson = false;
    let canCollapse = false;
    let canExpand = false; // reserved for collapsed meta-nodes in future milestones

    if (t.type === 'node') {
      const outs = outgoing(t.id);
      const resSet = new Set<string>();
      // Use the events to detect real distinct departments/resources handling this node
      for (const ev of events) {
        if (ev.activity === t.id) {
          if (ev.resource) resSet.add(ev.resource);
        }
      }
      canDecouplePerson = resSet.size >= 2;
      const isExpanded = expanded.has(t.id);
      canCollapse = isExpanded && outs.length > 0;
      canExpand = !isExpanded;
    }

    const baseItems: MenuItem[] = [];
    // Per-concept decouple or undo (node target only)
    const canDownOps = t.type === 'node';
    const pushConcept = (key: keyof typeof conceptPath, label: string, canDecouple: boolean) => {
      if (!canDownOps) return; // no decouple on edge targets
      const path = conceptPath[key];
      const hasDown = nodeAffectedByConcept(t.id, path);
      if (hasDown) {
        baseItems.push({ key: `undo:${key}`, label: `Undo decouple by ${label}`, enabled: true });
      } else {
        baseItems.push({ key, label: `Decouple by ${label}`, enabled: canDecouple });
      }
    };
    pushConcept('person', 'Person', canDecouplePerson);
    baseItems.push({ key: 'collapse', label: 'Collapse Following Transitions', enabled: t.type === 'node' && canCollapse });
    baseItems.push({ key: 'expand', label: 'Expand from here', enabled: t.type === 'node' && canExpand });

    // Only decouple person (toggle), and collapse/expand.
    return [...baseItems];
  }, [ctxMenu.open, ctxMenu.target, graph, decouples.length, events]);

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
            if (it.key === 'person') decoupleByPath(ctxMenu.target, 'resource', 'Person');
            if (it.key === 'undo:person' && ctxMenu.target.type === 'node') undoDecoupleByPathDownstream(ctxMenu.target.id, 'resource');
            if (it.key === 'expand' && ctxMenu.target.type === 'node') expandAllFrom(ctxMenu.target.id);
            if (it.key === 'collapse' && ctxMenu.target.type === 'node') collapseNode(ctxMenu.target.id);
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
