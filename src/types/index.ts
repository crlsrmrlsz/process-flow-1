export type EventLogEvent = {
  caseId: string;
  activity: string;
  timestamp: string; // ISO string
  resource?: string; // person/worker id
  department?: string; // department name
  attrs?: {
    amountDue?: number;
    amountPaid?: number;
    docsCount?: number;
    docQuality?: 'low' | 'ok' | 'high';
    channel?: 'online' | 'in-person';
    priority?: 'normal' | 'priority';
  };
};

export type Traversal = {
  caseId: string;
  startTs: string;
  endTs: string;
  durationMs: number;
};

export type NodeId = string;
export type EdgeId = string;

export type GraphNode = {
  id: NodeId;
  label: string;
};

export type GraphEdge = {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  count: number;
  traversals: Traversal[];
  // Derived stats (milliseconds)
  meanMs?: number;
  medianMs?: number;
  p90Ms?: number;
  minMs?: number;
  maxMs?: number;
  uniqueResources?: number;
  uniqueDepartments?: number;
};

export type Graph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: Record<NodeId, NodeId[]>; // outgoing
  reverse: Record<NodeId, NodeId[]>; // incoming
};

export type LayoutPositions = Record<NodeId, { x: number; y: number }>;
