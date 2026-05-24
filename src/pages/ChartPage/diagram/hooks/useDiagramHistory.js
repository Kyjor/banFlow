import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 50;

export function useDiagramHistory() {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [flags, setFlags] = useState({ canUndo: false, canRedo: false });

  const refreshFlags = useCallback(() => {
    setFlags({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    });
  }, []);

  const pushHistory = useCallback(
    (nodes, edges) => {
      pastRef.current = [
        ...pastRef.current.slice(-(MAX_HISTORY - 1)),
        {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        },
      ];
      futureRef.current = [];
      refreshFlags();
    },
    [refreshFlags],
  );

  const undo = useCallback(
    (currentNodes, currentEdges) => {
      if (pastRef.current.length === 0) return null;
      const previous = pastRef.current.pop();
      futureRef.current.push({
        nodes: JSON.parse(JSON.stringify(currentNodes)),
        edges: JSON.parse(JSON.stringify(currentEdges)),
      });
      refreshFlags();
      return previous;
    },
    [refreshFlags],
  );

  const redo = useCallback(
    (currentNodes, currentEdges) => {
      if (futureRef.current.length === 0) return null;
      const next = futureRef.current.pop();
      pastRef.current.push({
        nodes: JSON.parse(JSON.stringify(currentNodes)),
        edges: JSON.parse(JSON.stringify(currentEdges)),
      });
      refreshFlags();
      return next;
    },
    [refreshFlags],
  );

  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    refreshFlags();
  }, [refreshFlags]);

  const seedInitial = useCallback(
    (nodes, edges) => {
      pastRef.current = [
        {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        },
      ];
      futureRef.current = [];
      refreshFlags();
    },
    [refreshFlags],
  );

  return {
    pushHistory,
    undo,
    redo,
    canUndo: flags.canUndo,
    canRedo: flags.canRedo,
    resetHistory,
    seedInitial,
  };
}
