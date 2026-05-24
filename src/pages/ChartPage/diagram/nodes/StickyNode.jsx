import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { NodeResizer } from '@reactflow/node-resizer';
import { useReactFlow } from 'reactflow';
import NodeHandles from './NodeHandles';

function StickyNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const onLabelChange = useCallback(
    (e) => {
      const label = e.target.value;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label } } : n,
        ),
      );
    },
    [id, setNodes],
  );

  return (
    <>
      <NodeResizer minWidth={100} minHeight={80} isVisible={selected} color="#faad14" />
      <NodeHandles />
      <div
        className="sticky-node"
        style={{
          width: '100%',
          height: '100%',
          background: data.color || '#fffbe6',
          border: `1px solid ${selected ? '#faad14' : '#ffe58f'}`,
          boxShadow: '2px 4px 8px rgba(0,0,0,0.12)',
          padding: 8,
          boxSizing: 'border-box',
        }}
      >
        <textarea
          className="sticky-node-input nodrag"
          value={data.label || ''}
          onChange={onLabelChange}
          placeholder="Note..."
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            resize: 'none',
            outline: 'none',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        />
      </div>
    </>
  );
}

StickyNode.propTypes = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    label: PropTypes.string,
    color: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
};

export default memo(StickyNode);
