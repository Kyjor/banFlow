import React from 'react';
import PropTypes from 'prop-types';
import { Tag } from 'antd';
import NodeHandles from './NodeHandles';

export default function CustomNode({ data, selected }) {
  const { referencedNode: node, referencedParent: parent } = data;

  const handleNodeClick = (e, nodeId) => {
    e.stopPropagation();
    const projectName = data.projectName?.replace(/\//g, '@') || '';
    window.location.hash = `#/projectPage/${projectName}?node=${nodeId}`;
  };

  const handleParentClick = (e, parentId) => {
    e.stopPropagation();
    const projectName = data.projectName?.replace(/\//g, '@') || '';
    window.location.hash = `#/projectPage/${projectName}?parent=${parentId}`;
  };

  const borderColor = data.syncStatusColor
    ? data.borderColor || '#52c41a'
    : data.borderColor || '#d9d9d9';

  return (
    <div className={`custom-node ${selected ? 'selected' : ''}`}>
      <NodeHandles />
      <div
        className="custom-node-inner"
        style={{
          background: data.syncStatusColor || data.color || '#fff',
          border: `2px solid ${selected ? '#1890ff' : borderColor}`,
          borderRadius: '8px',
          padding: '12px',
          minWidth: '150px',
          cursor: 'pointer',
          boxShadow: selected
            ? '0 4px 12px rgba(24, 144, 255, 0.3)'
            : '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {data.image && (
          <img
            src={data.image}
            alt=""
            style={{
              width: '100%',
              height: '100px',
              objectFit: 'cover',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          />
        )}
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {data.label || 'Node'}
        </div>
        {node && (
          <Tag
            color="blue"
            style={{ marginTop: '4px', cursor: 'pointer' }}
            onClick={(e) => handleNodeClick(e, node.id)}
          >
            @{node.title}
          </Tag>
        )}
        {parent && (
          <Tag
            color="green"
            style={{ marginTop: '4px', cursor: 'pointer' }}
            onClick={(e) => handleParentClick(e, parent.id)}
          >
            @{parent.title}
          </Tag>
        )}
        {data.description && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {data.description}
          </div>
        )}
      </div>
    </div>
  );
}

CustomNode.propTypes = {
  data: PropTypes.shape({
    referencedNode: PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
    }),
    referencedParent: PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
    }),
    projectName: PropTypes.string,
    color: PropTypes.string,
    borderColor: PropTypes.string,
    syncStatusColor: PropTypes.string,
    image: PropTypes.string,
    label: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
};

CustomNode.defaultProps = {
  selected: false,
};
