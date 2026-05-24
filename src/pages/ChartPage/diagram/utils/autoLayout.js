import dagre from '@dagrejs/dagre';

export function getLayoutedElements(nodes, edges, direction = 'TB') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => {
    const width = node.style?.width || node.width || 150;
    const height = node.style?.height || node.height || 80;
    g.setNode(node.id, {
      width: typeof width === 'number' ? width : parseInt(width, 10) || 150,
      height: typeof height === 'number' ? height : parseInt(height, 10) || 80,
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    const width = node.style?.width || node.width || 150;
    const height = node.style?.height || node.height || 80;
    const w = typeof width === 'number' ? width : parseInt(width, 10) || 150;
    const h = typeof height === 'number' ? height : parseInt(height, 10) || 80;
    return {
      ...node,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}
