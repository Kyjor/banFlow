import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import NodeHandles from './NodeHandles';

function pointsToPath(points) {
  if (!points || points.length < 2) return '';
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  rest.forEach((p) => {
    d += ` L ${p.x} ${p.y}`;
  });
  return d;
}

function FreehandNode({ data, selected }) {
  const points = data.points || [];
  const path = useMemo(() => pointsToPath(points), [points]);

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const width = points.length ? Math.max(...xs, 1) + 4 : 1;
  const height = points.length ? Math.max(...ys, 1) + 4 : 1;

  return (
    <>
      <NodeHandles />
      <svg
        width={width}
        height={height}
        style={{ overflow: 'visible', pointerEvents: 'none' }}
      >
        <path
          d={path}
          fill="none"
          stroke={data.strokeColor || '#262626'}
          strokeWidth={data.strokeWidth || 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: selected ? 'drop-shadow(0 0 2px #1890ff)' : undefined,
          }}
        />
      </svg>
    </>
  );
}

FreehandNode.propTypes = {
  data: PropTypes.shape({
    points: PropTypes.arrayOf(
      PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
    ),
    strokeColor: PropTypes.string,
    strokeWidth: PropTypes.number,
  }).isRequired,
  selected: PropTypes.bool,
};

export default memo(FreehandNode);
