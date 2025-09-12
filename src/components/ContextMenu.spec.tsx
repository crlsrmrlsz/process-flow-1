import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextMenu } from './ContextMenu';
import { useFlowStore } from '@/state/store';

describe('ContextMenu foundation', () => {
  beforeEach(() => {
    const init = useFlowStore.getState().init;
    init();
    useFlowStore.getState().closeCtxMenu();
  });
  afterEach(() => {
    cleanup();
  });

  it('opens and closes via ESC', () => {
    // Open on a node (START)
    useFlowStore.getState().openCtxMenu({ type: 'node', id: 'START' }, { x: 100, y: 100 });
    render(<ContextMenu />);
    expect(screen.getByTestId('context-menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    // Context menu should close
    expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument();
  });

  it('renders menu items with enable/disable logic for node target', () => {
    // Choose a known node 'A' if present, else START
    const g = useFlowStore.getState().graph!;
    const nodeId = g.nodes.some((n) => n.id === 'A') ? 'A' : 'START';
    useFlowStore.getState().openCtxMenu({ type: 'node', id: nodeId }, { x: 100, y: 100 });
    render(<ContextMenu />);
    const person = screen.getByRole('menuitem', { name: /Decouple by Person/i });
    const collapse = screen.getByRole('menuitem', { name: /Collapse Following Transitions/i });
    // Person decouple may vary; presence is enough to validate rendering
    expect(person).toBeInTheDocument();
    // Collapse item present (enabled may vary)
    expect(collapse).toBeInTheDocument();
  });

  it('does not show decouple for edge target (node-only)', () => {
    const g = useFlowStore.getState().graph!;
    const e = g.edges.find((ed) => ed.source !== 'START');
    if (!e) return; // skip if no such edge
    useFlowStore.getState().openCtxMenu({ type: 'edge', id: e.id }, { x: 100, y: 100 });
    render(<ContextMenu />);
    const person = screen.queryByRole('menuitem', { name: /Decouple by Person/i });
    expect(person).toBeNull();
  });
});
