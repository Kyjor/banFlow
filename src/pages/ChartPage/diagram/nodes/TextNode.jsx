import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { NodeResizer } from '@reactflow/node-resizer';
import { useReactFlow } from 'reactflow';
import NodeHandles from './NodeHandles';

function TextNode({ id, data, selected }) {
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
      <NodeResizer minWidth={60} minHeight={24} isVisible={selected} color="#1890ff" />
      <NodeHandles />
      <div
        className="text-node"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          className="text-node-input nodrag"
          value={data.label || ''}
          onChange={onLabelChange}
          placeholder="Text"
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            outline: selected ? '1px dashed #1890ff' : 'none',
            fontSize: 14,
            padding: 4,
          }}
        />
      </div>
    </>
  );
}

TextNode.propTypes = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({ label: PropTypes.string }).isRequired,
  selected: PropTypes.bool,
};

export default memo(TextNode);
