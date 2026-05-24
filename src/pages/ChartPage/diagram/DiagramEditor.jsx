import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { message } from 'antd';
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { diagramNodeTypes } from './nodes';
import { diagramEdgeTypes } from './edges';
import DiagramToolbar from './DiagramToolbar';
import DiagramPalette from './DiagramPalette';
import NodeInspector from './NodeInspector';
import EdgeInspector from './EdgeInspector';
import { useDiagramHistory } from './hooks/useDiagramHistory';
import {
  TOOLS,
  SNAP_GRID,
  normalizeDiagramContent,
  createCustomNode,
  createShapeNode,
  createTextNode,
  createStickyNode,
  createFreehandNode,
  createEdge,
  statusColorForNode,
} from './utils/diagramDefaults';
import { getLayoutedElements } from './utils/autoLayout';
import { exportDiagramPng } from './utils/exportDiagram';

function DiagramEditorInner({
  diagramData,
  diagramKey,
  projectName,
  banflowNodes,
  banflowParents,
  isDirty,
  autosaveEnabled,
  onDiagramChange,
  onSave,
  onAutosaveChange,
  onOpenImagePicker,
  images,
}) {
  const reactFlowWrapper = useRef(null);
  const fitViewDoneRef = useRef(false);
  const penPointsRef = useRef([]);
  const historyDebounceRef = useRef(null);
  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition, fitView, setViewport } = reactFlowInstance;

  const normalized = useMemo(
    () => normalizeDiagramContent(diagramData),
    [diagramData],
  );

  const [nodes, setNodes] = useState(normalized.nodes);
  const [edges, setEdges] = useState(normalized.edges);
  const [viewport, setViewportState] = useState(normalized.viewport);
  const [meta, setMeta] = useState(normalized.meta);
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [shapeVariant, setShapeVariant] = useState('rectangle');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [nodeInspectorOpen, setNodeInspectorOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [clipboard, setClipboard] = useState(null);
  const [isPenDrawing, setIsPenDrawing] = useState(false);

  const { pushHistory, undo, redo, canUndo, canRedo, resetHistory, seedInitial } =
    useDiagramHistory();

  const emitChange = useCallback(
    (nextNodes, nextEdges, nextViewport, nextMeta, dirty = true) => {
      onDiagramChange(
        {
          nodes: nextNodes,
          edges: nextEdges,
          viewport: nextViewport,
          meta: nextMeta,
        },
        dirty,
      );
    },
    [onDiagramChange],
  );

  const scheduleHistory = useCallback(
    (nextNodes, nextEdges) => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      historyDebounceRef.current = setTimeout(() => {
        pushHistory(nextNodes, nextEdges);
      }, 300);
    },
    [pushHistory],
  );

  useEffect(() => {
    const n = normalizeDiagramContent(diagramData);
    setNodes(n.nodes);
    setEdges(n.edges);
    setViewportState(n.viewport);
    setMeta(n.meta);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setNodeInspectorOpen(false);
    fitViewDoneRef.current = false;
    resetHistory();
    seedInitial(n.nodes, n.edges);
    if (n.viewport) {
      setViewport(n.viewport);
    }
  }, [diagramKey, diagramData, resetHistory, seedInitial, setViewport]);

  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        scheduleHistory(next, edges);
        emitChange(next, edges, viewport, meta);
        return next;
      });
    },
    [edges, viewport, meta, emitChange, scheduleHistory],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        scheduleHistory(nodes, next);
        emitChange(nodes, next, viewport, meta);
        return next;
      });
    },
    [nodes, viewport, meta, emitChange, scheduleHistory],
  );

  const onConnect = useCallback(
    (params) => {
      if (activeTool === TOOLS.PAN) return;
      const newEdge = createEdge(params, meta.defaultEdgeType || 'straight');
      setEdges((eds) => {
        const next = addEdge(newEdge, eds);
        scheduleHistory(nodes, next);
        emitChange(nodes, next, viewport, meta);
        return next;
      });
    },
    [activeTool, meta, nodes, viewport, emitChange, scheduleHistory],
  );

  const onMoveEnd = useCallback(
    (_, vp) => {
      setViewportState(vp);
      emitChange(nodes, edges, vp, meta, true);
    },
    [nodes, edges, meta, emitChange],
  );

  const onInit = useCallback(() => {
    if (!fitViewDoneRef.current && nodes.length > 0) {
      fitView({ padding: 0.2 });
      fitViewDoneRef.current = true;
    }
  }, [fitView, nodes.length]);

  const placeNodeAt = useCallback(
    (factory) => {
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const node = factory(center);
      setNodes((nds) => {
        const next = [...nds, node];
        scheduleHistory(next, edges);
        emitChange(next, edges, viewport, meta);
        return next;
      });
      setSelectedNodeId(node.id);
      if (node.type === 'custom') setNodeInspectorOpen(true);
    },
    [screenToFlowPosition, edges, viewport, meta, emitChange, scheduleHistory],
  );

  const onPaneClick = useCallback(
    (event) => {
      if (activeTool === TOOLS.PEN || isPenDrawing) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (activeTool === TOOLS.SHAPE) {
        const node = createShapeNode(position, shapeVariant);
        setNodes((nds) => {
          const next = [...nds, node];
          scheduleHistory(next, edges);
          emitChange(next, edges, viewport, meta);
          return next;
        });
        setSelectedNodeId(node.id);
      } else if (activeTool === TOOLS.TEXT) {
        const node = createTextNode(position);
        setNodes((nds) => {
          const next = [...nds, node];
          scheduleHistory(next, edges);
          emitChange(next, edges, viewport, meta);
          return next;
        });
        setSelectedNodeId(node.id);
      } else if (activeTool === TOOLS.STICKY) {
        const node = createStickyNode(position);
        setNodes((nds) => {
          const next = [...nds, node];
          scheduleHistory(next, edges);
          emitChange(next, edges, viewport, meta);
          return next;
        });
        setSelectedNodeId(node.id);
      } else if (activeTool === TOOLS.CARD) {
        const node = createCustomNode(position, projectName);
        setNodes((nds) => {
          const next = [...nds, node];
          scheduleHistory(next, edges);
          emitChange(next, edges, viewport, meta);
          return next;
        });
        setSelectedNodeId(node.id);
        setNodeInspectorOpen(true);
      }
    },
    [
      activeTool,
      isPenDrawing,
      screenToFlowPosition,
      shapeVariant,
      edges,
      viewport,
      meta,
      projectName,
      emitChange,
      scheduleHistory,
    ],
  );

  const onPaneMouseDown = useCallback(
    (event) => {
      if (activeTool !== TOOLS.PEN) return;
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      penPointsRef.current = [point];
      setIsPenDrawing(true);
    },
    [activeTool, screenToFlowPosition],
  );

  const onPaneMouseMove = useCallback(
    (event) => {
      if (!isPenDrawing || activeTool !== TOOLS.PEN) return;
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const pts = penPointsRef.current;
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(last.x - point.x, last.y - point.y) > 2) {
        penPointsRef.current = [...pts, point];
      }
    },
    [isPenDrawing, activeTool, screenToFlowPosition],
  );

  const onPaneMouseUp = useCallback(() => {
    if (!isPenDrawing) return;
    setIsPenDrawing(false);
    const node = createFreehandNode(penPointsRef.current);
    penPointsRef.current = [];
    if (!node) return;
    setNodes((nds) => {
      const next = [...nds, node];
      scheduleHistory(next, edges);
      emitChange(next, edges, viewport, meta);
      return next;
    });
  }, [isPenDrawing, edges, viewport, meta, emitChange, scheduleHistory]);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/banflow-diagram');
      if (!raw) return;
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const ref =
        payload.kind === 'node'
          ? banflowNodes[payload.id]
          : banflowParents[payload.id];
      if (!ref) return;

      const statusColor = payload.kind === 'node' ? statusColorForNode(ref) : null;
      const node = createCustomNode(position, projectName, {
        label: ref.title,
        referencedNode: payload.kind === 'node' ? ref : undefined,
        nodeReferenceId: payload.kind === 'node' ? payload.id : null,
        referencedParent: payload.kind === 'parent' ? ref : undefined,
        parentReferenceId: payload.kind === 'parent' ? payload.id : null,
        syncStatusColor: statusColor,
        color: statusColor || '#fff',
      });

      setNodes((nds) => {
        const next = [...nds, node];
        scheduleHistory(next, edges);
        emitChange(next, edges, viewport, meta);
        return next;
      });
      setSelectedNodeId(node.id);
      setNodeInspectorOpen(true);
    },
    [
      screenToFlowPosition,
      banflowNodes,
      banflowParents,
      projectName,
      edges,
      viewport,
      meta,
      emitChange,
      scheduleHistory,
    ],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId),
    [edges, selectedEdgeId],
  );

  const updateNodeData = useCallback(
    (patch) => {
      if (!selectedNodeId) return;
      setNodes((nds) => {
        const next = nds.map((n) =>
          n.id === selectedNodeId
            ? { ...n, data: { ...n.data, ...patch } }
            : n,
        );
        scheduleHistory(next, edges);
        emitChange(next, edges, viewport, meta);
        return next;
      });
    },
    [selectedNodeId, edges, viewport, meta, emitChange, scheduleHistory],
  );

  const updateEdge = useCallback(
    (patch) => {
      if (!selectedEdgeId) return;
      setEdges((eds) => {
        const next = eds.map((e) =>
          e.id === selectedEdgeId ? { ...e, ...patch, data: { ...e.data, ...(patch.data || {}) } } : e,
        );
        scheduleHistory(nodes, next);
        emitChange(nodes, next, viewport, meta);
        return next;
      });
    },
    [selectedEdgeId, nodes, viewport, meta, emitChange, scheduleHistory],
  );

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => {
      const next = nds.filter((n) => n.id !== selectedNodeId);
      scheduleHistory(next, edges);
      emitChange(next, edges, viewport, meta);
      return next;
    });
    setSelectedNodeId(null);
    setNodeInspectorOpen(false);
  }, [selectedNodeId, edges, viewport, meta, emitChange, scheduleHistory]);

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    setEdges((eds) => {
      const next = eds.filter((e) => e.id !== selectedEdgeId);
      scheduleHistory(nodes, next);
      emitChange(nodes, next, viewport, meta);
      return next;
    });
    setSelectedEdgeId(null);
  }, [selectedEdgeId, nodes, viewport, meta, emitChange, scheduleHistory]);

  const handleDuplicate = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    const idMap = {};
    const clones = selected.map((n) => {
      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      idMap[n.id] = id;
      return {
        ...n,
        id,
        selected: true,
        position: { x: n.position.x + 24, y: n.position.y + 24 },
      };
    });
    const selectedIds = new Set(selected.map((n) => n.id));
    const edgeClones = edges
      .filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))
      .map((e) => ({
        ...e,
        id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source: idMap[e.source],
        target: idMap[e.target],
      }));

    setNodes((nds) => {
      const cleared = nds.map((n) => ({ ...n, selected: false }));
      const next = [...cleared, ...clones];
      setEdges((eds) => {
        const nextEdges = [...eds, ...edgeClones];
        scheduleHistory(next, nextEdges);
        emitChange(next, nextEdges, viewport, meta);
        return nextEdges;
      });
      return next;
    });
  }, [nodes, edges, viewport, meta, emitChange, scheduleHistory]);

  const handleAlign = useCallback(
    (mode) => {
      const selected = nodes.filter((n) => n.selected);
      if (selected.length < 2) return;
      const xs = selected.map((n) => n.position.x);
      const ys = selected.map((n) => n.position.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      setNodes((nds) => {
        const next = nds.map((n) => {
          if (!n.selected) return n;
          let { x, y } = n.position;
          if (mode === 'left') x = minX;
          if (mode === 'right') x = maxX;
          if (mode === 'centerH') x = midX;
          if (mode === 'top') y = minY;
          if (mode === 'bottom') y = maxY;
          if (mode === 'centerV') y = midY;
          return { ...n, position: { x, y } };
        });
        scheduleHistory(next, edges);
        emitChange(next, edges, viewport, meta);
        return next;
      });
    },
    [nodes, edges, viewport, meta, emitChange, scheduleHistory],
  );

  const handleAutoLayout = useCallback(() => {
    const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
    );
    setNodes(layouted);
    setEdges(layoutedEdges);
    scheduleHistory(layouted, layoutedEdges);
    emitChange(layouted, layoutedEdges, viewport, meta);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, viewport, meta, emitChange, scheduleHistory, fitView]);

  const handleExportPng = useCallback(async () => {
    try {
      await exportDiagramPng(
        reactFlowInstance,
        `${(diagramKey || 'diagram').replace(/\.json$/, '')}.png`,
      );
      message.success('Exported PNG');
    } catch (e) {
      message.error(e.message || 'Export failed');
    }
  }, [reactFlowInstance, diagramKey]);

  const handleUndo = useCallback(() => {
    const prev = undo(nodes, edges);
    if (prev) {
      setNodes(prev.nodes);
      setEdges(prev.edges);
      emitChange(prev.nodes, prev.edges, viewport, meta);
    }
  }, [undo, nodes, edges, viewport, meta, emitChange]);

  const handleRedo = useCallback(() => {
    const next = redo(nodes, edges);
    if (next) {
      setNodes(next.nodes);
      setEdges(next.edges);
      emitChange(next.nodes, next.edges, viewport, meta);
    }
  }, [redo, nodes, edges, viewport, meta, emitChange]);

  const getNodeSuggestions = useCallback(
    (query) => {
      const q = (query || '').toLowerCase();
      return Object.values(banflowNodes || {})
        .filter((n) => n.title && n.title.toLowerCase().includes(q))
        .slice(0, 10)
        .map((n) => ({ value: n.id, label: n.title, node: n }));
    },
    [banflowNodes],
  );

  const getParentSuggestions = useCallback(
    (query) => {
      const q = (query || '').toLowerCase();
      return Object.values(banflowParents || {})
        .filter((p) => p.title && p.title.toLowerCase().includes(q))
        .slice(0, 10)
        .map((p) => ({ value: p.id, label: p.title, parent: p }));
    },
    [banflowParents],
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onSave();
      } else if (e.key === 'v') setActiveTool(TOOLS.SELECT);
      else if (e.key === 'h') setActiveTool(TOOLS.PAN);
      else if (e.key === 'c') setActiveTool(TOOLS.CONNECTOR);
      else if (e.key === 'p') setActiveTool(TOOLS.PEN);
      else if (e.key === 't') setActiveTool(TOOLS.TEXT);
      else if (e.key === 'n') setActiveTool(TOOLS.STICKY);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, handleDuplicate, onSave]);

  const panOnDrag = activeTool === TOOLS.PAN ? [0, 1, 2] : [1, 2];
  const nodesConnectable =
    activeTool === TOOLS.CONNECTOR || activeTool === TOOLS.SELECT;
  const selectionOnDrag = activeTool === TOOLS.SELECT;
  const cursorClass =
    activeTool === TOOLS.PEN
      ? 'diagram-cursor-pen'
      : activeTool === TOOLS.PAN
        ? 'diagram-cursor-pan'
        : '';

  return (
    <div className="diagram-editor">
      <DiagramToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        shapeVariant={shapeVariant}
        onShapeVariantChange={setShapeVariant}
        defaultEdgeType={meta.defaultEdgeType || 'straight'}
        onDefaultEdgeTypeChange={(t) => {
          const nextMeta = { ...meta, defaultEdgeType: t };
          setMeta(nextMeta);
          emitChange(nodes, edges, viewport, nextMeta);
        }}
        gridSnap={meta.gridSnap !== false}
        onGridSnapChange={(v) => {
          const nextMeta = { ...meta, gridSnap: v };
          setMeta(nextMeta);
          emitChange(nodes, edges, viewport, nextMeta);
        }}
        isDirty={isDirty}
        autosaveEnabled={autosaveEnabled}
        onAutosaveChange={onAutosaveChange}
        onSave={onSave}
        onFitView={() => fitView({ padding: 0.2 })}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onDuplicate={handleDuplicate}
        onAlign={handleAlign}
        onAutoLayout={handleAutoLayout}
        onExportPng={handleExportPng}
      />

      <div className="diagram-editor-body">
        <DiagramPalette
          nodes={banflowNodes}
          parents={banflowParents}
          search={paletteSearch}
          onSearchChange={setPaletteSearch}
        />

        <div
          ref={reactFlowWrapper}
          className={`diagram-canvas-wrap ${cursorClass}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onMoveEnd={onMoveEnd}
            onPaneClick={onPaneClick}
            onPaneMouseDown={onPaneMouseDown}
            onPaneMouseMove={onPaneMouseMove}
            onPaneMouseUp={onPaneMouseUp}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
              if (node.type === 'custom') setNodeInspectorOpen(true);
            }}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
              setNodeInspectorOpen(false);
            }}
            onPaneContextMenu={(e) => e.preventDefault()}
            nodeTypes={diagramNodeTypes}
            edgeTypes={diagramEdgeTypes}
            defaultViewport={viewport}
            snapToGrid={meta.gridSnap !== false}
            snapGrid={SNAP_GRID}
            connectionMode={ConnectionMode.Loose}
            connectionLineType={ConnectionLineType.Straight}
            defaultEdgeOptions={{
              type: meta.defaultEdgeType || 'straight',
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
            nodesConnectable={nodesConnectable}
            elementsSelectable
            deleteKeyCode={['Backspace', 'Delete']}
            panOnDrag={panOnDrag}
            selectionOnDrag={selectionOnDrag}
            fitView={false}
          >
            <Background
              variant={
                meta.gridSnap !== false
                  ? BackgroundVariant.Dots
                  : BackgroundVariant.Lines
              }
              gap={16}
            />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {selectedEdge && !nodeInspectorOpen && (
          <EdgeInspector
            edge={selectedEdge}
            onUpdate={updateEdge}
            onDelete={deleteSelectedEdge}
            onClose={() => setSelectedEdgeId(null)}
          />
        )}
      </div>

      <NodeInspector
        open={nodeInspectorOpen && !!selectedNode}
        node={selectedNode}
        projectName={projectName}
        nodes={banflowNodes}
        parents={banflowParents}
        onUpdate={updateNodeData}
        onDelete={deleteSelectedNode}
        onClose={() => {
          setNodeInspectorOpen(false);
          setSelectedNodeId(null);
        }}
        onOpenImagePicker={onOpenImagePicker}
        onRemoveImage={() => updateNodeData({ image: null })}
        getNodeSuggestions={getNodeSuggestions}
        getParentSuggestions={getParentSuggestions}
        onNodeReferenceSelect={(id) => {
          const n = banflowNodes[id];
          if (n) {
            updateNodeData({
              referencedNode: n,
              nodeReferenceId: id,
              syncStatusColor: statusColorForNode(n),
            });
          }
        }}
        onParentReferenceSelect={(id) => {
          const p = banflowParents[id];
          if (p) updateNodeData({ referencedParent: p, parentReferenceId: id });
        }}
        onRemoveNodeReference={() =>
          updateNodeData({ referencedNode: null, nodeReferenceId: null })
        }
        onRemoveParentReference={() =>
          updateNodeData({ referencedParent: null, parentReferenceId: null })
        }
      />
    </div>
  );
}

DiagramEditorInner.propTypes = {
  diagramData: PropTypes.object,
  diagramKey: PropTypes.string,
  projectName: PropTypes.string.isRequired,
  banflowNodes: PropTypes.object,
  banflowParents: PropTypes.object,
  isDirty: PropTypes.bool,
  autosaveEnabled: PropTypes.bool,
  onDiagramChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onAutosaveChange: PropTypes.func.isRequired,
  onOpenImagePicker: PropTypes.func,
  images: PropTypes.array,
};

export default function DiagramEditor(props) {
  return (
    <ReactFlowProvider>
      <DiagramEditorInner {...props} />
    </ReactFlowProvider>
  );
}
