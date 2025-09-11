import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFlowStore } from '@/state/store';
import { bfsLayers } from '@/lib/graph';

type MenuItem = {
  key: string;
  label: string;
  enabled: boolean;
  onSelect?: () => void; // not wired yet in Milestone 3
};

export function ContextMenu() {
  const { ctxMenu, graph, events, decouples, closeCtxMenu, decoupleByDepartment, decoupleByPath, clearLastDecouple, resetDecouples, resetDecouplesDownstream, undoDecoupleByPathDownstream } = useFlowStore((s) => ({
    ctxMenu: s.ctxMenu,
    graph: s.graph,
    events: s.events,
    decouples: s.decouples,
    closeCtxMenu: s.closeCtxMenu,
    decoupleByDepartment: s.decoupleByDepartment,
    decoupleByPath: s.decoupleByPath,
    clearLastDecouple: s.clearLastDecouple,
    resetDecouples: s.resetDecouples,
    resetDecouplesDownstream: s.resetDecouplesDownstream,
    undoDecoupleByPathDownstream: s.undoDecoupleByPathDownstream,
  }));

  const menuRef = useRef<HTMLDivElement | null>(null);

  const items: MenuItem[] = useMemo(() => {
    if (!ctxMenu.open || !ctxMenu.target || !graph) return [];
    const t = ctxMenu.target;

    // Helpers
    const outgoing = (nodeId: string) => graph.edges.filter((e) => e.source === nodeId);
    const edgeById = (id: string) => graph.edges.find((e) => e.id === id);
    // Reachability helpers
    const distFrom = (nodeId: string) => bfsLayers(graph, [nodeId]);
    const nodeReachableFromTarget = (layerTarget: { type: 'node' | 'edge'; id: string }, nodeId: string) => {
      // A layer's effect region starts at its target (node) or at the source of its edge target
      const origin = layerTarget.type === 'node' ? layerTarget.id : layerTarget.id.split('__')[0];
      const dist = distFrom(origin);
      return dist[nodeId] != null;
    };
    const nodeAffectedByAnyDecouple = (nodeId: string) => decouples.some((l) => nodeReachableFromTarget(l.target, nodeId));
    const conceptPath = {
      dept: 'department',
      person: 'resource',
      channel: 'attributes.channel',
      priority: 'attributes.priority',
      docQuality: 'attributes.docQuality',
    } as const;
    const nodeAffectedByConcept = (nodeId: string, path: string) => decouples.some((l) => l.path === path && nodeReachableFromTarget(l.target, nodeId));

    let canDecoupleDept = false;
    let canDecouplePerson = false;
    let canDecoupleChannel = false;
    let canDecouplePriority = false;
    let canDecoupleDocQuality = false;
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
      const chanSet = new Set<string>();
      const priSet = new Set<string>();
      const dqSet = new Set<string>();
      // Use the events to detect real distinct departments/resources handling this node
      for (const ev of events) {
        if (ev.activity === t.id) {
          if (ev.department) depSet.add(ev.department);
          if (ev.resource) resSet.add(ev.resource);
          const attrs = ev.attributes ?? ev.attrs;
          if (attrs?.channel) chanSet.add(attrs.channel);
          if (attrs?.priority) priSet.add(attrs.priority);
          if (attrs?.docQuality) dqSet.add(attrs.docQuality);
        }
      }
      canDecoupleDept = depSet.size >= 2;
      canDecouplePerson = resSet.size >= 2;
      canDecoupleChannel = chanSet.size >= 2;
      canDecouplePriority = priSet.size >= 2;
      canDecoupleDocQuality = dqSet.size >= 2;
      canCollapse = outs.length > 0;
      // Show cases here if node has any incident edges
      canShowCases = graph.edges.some((e) => e.source === t.id || e.target === t.id);
    }

    const baseItems: MenuItem[] = [];
    // Per-concept decouple or undo (node target only for downstream operations)
    const canDownOps = t.type === 'node';
    const pushConcept = (key: keyof typeof conceptPath, label: string, canDecouple: boolean) => {
      if (!canDownOps) {
        baseItems.push({ key, label: `Decouple by ${label}`, enabled: canDecouple });
        return;
      }
      const path = conceptPath[key];
      const hasDown = nodeAffectedByConcept(t.id, path);
      if (hasDown) {
        baseItems.push({ key: `undo:${key}`, label: `Undo decouple by ${label}`, enabled: true });
      } else {
        baseItems.push({ key, label: `Decouple by ${label}`, enabled: canDecouple });
      }
    };
    pushConcept('dept', 'Department', canDecoupleDept);
    pushConcept('person', 'Person', canDecouplePerson);
    pushConcept('channel', 'Channel', canDecoupleChannel);
    pushConcept('priority', 'Priority', canDecouplePriority);
    pushConcept('docQuality', 'Doc Quality', canDecoupleDocQuality);
    baseItems.push({ key: 'collapse', label: 'Collapse Following Transitions', enabled: t.type === 'node' && canCollapse });
    baseItems.push({ key: 'expand', label: 'Expand', enabled: canExpand });
    baseItems.push({ key: 'cases', label: 'Show cases here', enabled: canShowCases });

    // Downstream reset (node only)
    if (t.type === 'node') {
      const hasAnyDown = nodeAffectedByAnyDecouple(t.id);
      if (hasAnyDown) baseItems.push({ key: 'resetDownstream', label: 'Reset decouples downstream', enabled: true });
    }
    const layerItems: MenuItem[] = [];
    if (decouples.length) {
      layerItems.push({ key: 'clearLast', label: 'Clear last decouple', enabled: true });
      layerItems.push({ key: 'resetAll', label: 'Reset decouples', enabled: true });
    }
    return [...baseItems, ...layerItems];
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
            if (it.key === 'dept') decoupleByDepartment(ctxMenu.target);
            if (it.key === 'person') decoupleByPath(ctxMenu.target, 'resource', 'Person');
            if (it.key === 'channel') decoupleByPath(ctxMenu.target, 'attributes.channel', 'Channel');
            if (it.key === 'priority') decoupleByPath(ctxMenu.target, 'attributes.priority', 'Priority');
            if (it.key === 'docQuality') decoupleByPath(ctxMenu.target, 'attributes.docQuality', 'Doc Quality');
            if (it.key === 'undo:dept' && ctxMenu.target.type === 'node') undoDecoupleByPathDownstream(ctxMenu.target.id, 'department');
            if (it.key === 'undo:person' && ctxMenu.target.type === 'node') undoDecoupleByPathDownstream(ctxMenu.target.id, 'resource');
            if (it.key === 'undo:channel' && ctxMenu.target.type === 'node') undoDecoupleByPathDownstream(ctxMenu.target.id, 'attributes.channel');
            if (it.key === 'undo:priority' && ctxMenu.target.type === 'node') undoDecoupleByPathDownstream(ctxMenu.target.id, 'attributes.priority');
            if (it.key === 'undo:docQuality' && ctxMenu.target.type === 'node') undoDecoupleByPathDownstream(ctxMenu.target.id, 'attributes.docQuality');
            if (it.key === 'resetDownstream' && ctxMenu.target.type === 'node') resetDecouplesDownstream(ctxMenu.target.id);
            if (it.key === 'clearLast') clearLastDecouple();
            if (it.key === 'resetAll') resetDecouples();
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
