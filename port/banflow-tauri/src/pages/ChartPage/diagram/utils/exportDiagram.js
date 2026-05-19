import { toPng } from 'html-to-image';
import { getNodesBounds, getViewportForBounds } from 'reactflow';

export async function exportDiagramPng(reactFlowInstance, filename = 'diagram.png') {
  const nodes = reactFlowInstance.getNodes();
  if (!nodes.length) {
    throw new Error('Nothing to export');
  }

  const bounds = getNodesBounds(nodes);
  const padding = 40;
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;
  const viewport = getViewportForBounds(
    bounds,
    width,
    height,
    0.5,
    2,
    padding,
  );

  const viewportEl = document.querySelector('.react-flow__viewport');
  if (!viewportEl) {
    throw new Error('Canvas not found');
  }

  const dataUrl = await toPng(viewportEl, {
    backgroundColor: '#fafafa',
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
