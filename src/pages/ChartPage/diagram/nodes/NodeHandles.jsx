import React from 'react';
import { Handle, Position } from 'reactflow';

const SIDES = [
  { position: Position.Top, id: 'top' },
  { position: Position.Right, id: 'right' },
  { position: Position.Bottom, id: 'bottom' },
  { position: Position.Left, id: 'left' },
];

export default function NodeHandles() {
  return SIDES.map(({ position, id }) => (
    <React.Fragment key={id}>
      <Handle
        type="target"
        position={position}
        id={`${id}-target`}
        className="diagram-handle"
      />
      <Handle
        type="source"
        position={position}
        id={`${id}-source`}
        className="diagram-handle"
      />
    </React.Fragment>
  ));
}
