import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import NodeHandles from './NodeHandles';

const shapeStyles = {
  rectangle: { borderRadius: 0 },
  rounded: { borderRadius: 12 },
  diamond: { transform: 'rotate(45deg)', borderRadius: 4 },
  circle: { borderRadius: '50%' },
  parallelogram: { transform: 'skewX(-12deg)', borderRadius: 4 },
};

function ShapeNode({ data, selected }) {
  const shape = data.shape || 'rectangle';
  const extra = shapeStyles[shape] || shapeStyles.rectangle;
  const isDiamond = shape === 'diamond' || shape === 'parallelogram';

  return (
    <>
      <NodeResizer
        minWidth={40}
        minHeight={40}
        isVisible={selected}
        color="#1890ff"
      />
      <NodeHandles />
      <div
        className={`shape-node shape-${shape}`}
        style={{
          width: '100%',
          height: '100%',
          background: data.color || '#fff',
          border: `2px solid ${selected ? '#1890ff' : data.borderColor || '#595959'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
          boxSizing: 'border-box',
          ...extra,
        }}
      >
        <div
          style={{
            transform: isDiamond ? 'rotate(-45deg)' : shape === 'parallelogram' ? 'skewX(12deg)' : undefined,
            fontSize: 13,
            textAlign: 'center',
            wordBreak: 'break-word',
            width: '100%',
          }}
        >
          {data.label}
        </div>
      </div>
    </>
  );
}

ShapeNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    shape: PropTypes.string,
    color: PropTypes.string,
    borderColor: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
};

ShapeNode.defaultProps = {
  selected: false,
};

export default memo(ShapeNode);
