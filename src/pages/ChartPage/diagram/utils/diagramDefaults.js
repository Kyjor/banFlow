import { MarkerType } from 'reactflow';

export const DEFAULT_META = {
  defaultEdgeType: 'straight',
  gridSnap: true,
};

export const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };

export const SNAP_GRID = [16, 16];

export const TOOLS = {
  SELECT: 'select',
  PAN: 'pan',
  CONNECTOR: 'connector',
  SHAPE: 'shape',
  TEXT: 'text',
  STICKY: 'sticky',
  PEN: 'pen',
  CARD: 'card',
};

export const SHAPE_VARIANTS = [
  'rectangle',
  'rounded',
  'diamond',
  'circle',
  'parallelogram',
];

export const EDGE_TYPES = ['straight', 'step', 'smoothstep', 'bezier'];

export function normalizeDiagramContent(content) {
  if (!content) {
    return {
      nodes: [],
      edges: [],
      viewport: { ...DEFAULT_VIEWPORT },
      meta: { ...DEFAULT_META },
    };
  }
  return {
    nodes: content.nodes || [],
    edges: content.edges || [],
    viewport: content.viewport || { ...DEFAULT_VIEWPORT },
    meta: { ...DEFAULT_META, ...(content.meta || {}) },
  };
}

export function createNodeId(prefix = 'node') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEdgeId() {
  return `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createCustomNode(position, projectName, extraData = {}) {
  return {
    id: createNodeId('custom'),
    type: 'custom',
    position,
    data: {
      label: 'Card',
      color: '#fff',
      borderColor: '#d9d9d9',
      projectName,
      ...extraData,
    },
  };
}

export function createShapeNode(position, shape = 'rectangle') {
  return {
    id: createNodeId('shape'),
    type: 'shape',
    position,
    data: { label: '', shape, color: '#ffffff', borderColor: '#595959' },
    style: { width: 120, height: 80 },
  };
}

export function createTextNode(position) {
  return {
    id: createNodeId('text'),
    type: 'text',
    position,
    data: { label: 'Text' },
    style: { width: 120, height: 40 },
  };
}

export function createStickyNode(position) {
  return {
    id: createNodeId('sticky'),
    type: 'sticky',
    position,
    data: { label: 'Note', color: '#fffbe6' },
    style: { width: 160, height: 120 },
  };
}

export function createFreehandNode(points, strokeColor = '#262626') {
  if (!points.length) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const normalized = points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
  return {
    id: createNodeId('freehand'),
    type: 'freehand',
    position: { x: minX, y: minY },
    data: { points: normalized, strokeColor, strokeWidth: 2 },
    selectable: true,
    draggable: true,
  };
}

export function createEdge(params, edgeType = 'straight') {
  return {
    ...params,
    id: createEdgeId(),
    type: edgeType,
    animated: false,
    data: { label: '' },
    markerEnd: { type: MarkerType.ArrowClosed },
  };
}

export function statusColorForNode(banflowNode) {
  if (!banflowNode) return null;
  const status = banflowNode.status || banflowNode.state;
  const map = {
    done: '#b7eb8f',
    complete: '#b7eb8f',
    'in-progress': '#91d5ff',
    progress: '#91d5ff',
    blocked: '#ffa39e',
    todo: '#fff',
  };
  if (typeof status === 'string') {
    return map[status.toLowerCase()] || null;
  }
  return null;
}
