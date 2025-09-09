export type EventLogEvent = {
  caseId: string;
  activity: string;
  timestamp: string; // ISO string
  resource?: string;
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
};

export type Graph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: Record<NodeId, NodeId[]>; // outgoing
  reverse: Record<NodeId, NodeId[]>; // incoming
};

export type LayoutPositions = Record<NodeId, { x: number; y: number }>;

