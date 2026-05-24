import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Collapse, Input, List, Typography } from 'antd';
import { statusColorForNode } from './utils/diagramDefaults';

const { Text } = Typography;
const { Panel } = Collapse;

export default function DiagramPalette({
  nodes,
  parents,
  search,
  onSearchChange,
  onDragStart,
}) {
  const nodeList = useMemo(() => {
    const q = (search || '').toLowerCase();
    return Object.values(nodes || {})
      .filter((n) => n.title && (!q || n.title.toLowerCase().includes(q)))
      .slice(0, 40);
  }, [nodes, search]);

  const parentList = useMemo(() => {
    const q = (search || '').toLowerCase();
    return Object.values(parents || {})
      .filter((p) => p.title && (!q || p.title.toLowerCase().includes(q)))
      .slice(0, 40);
  }, [parents, search]);

  const onDrag = (e, item, kind) => {
    e.dataTransfer.setData(
      'application/banflow-diagram',
      JSON.stringify({ kind, id: item.id, title: item.title }),
    );
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(item, kind);
  };

  return (
    <div className="diagram-palette">
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        Project palette
      </Text>
      <Input
        size="small"
        placeholder="Filter..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <Collapse defaultActiveKey={['nodes', 'parents']} ghost size="small">
        <Panel header={`Nodes (${nodeList.length})`} key="nodes">
          <List
            size="small"
            dataSource={nodeList}
            renderItem={(item) => (
              <List.Item
                draggable
                onDragStart={(e) => onDrag(e, item, 'node')}
                className="diagram-palette-item"
                style={{
                  cursor: 'grab',
                  borderLeft: `3px solid ${statusColorForNode(item) || '#d9d9d9'}`,
                  paddingLeft: 8,
                }}
              >
                <Text ellipsis>{item.title}</Text>
              </List.Item>
            )}
          />
        </Panel>
        <Panel header={`Parents (${parentList.length})`} key="parents">
          <List
            size="small"
            dataSource={parentList}
            renderItem={(item) => (
              <List.Item
                draggable
                onDragStart={(e) => onDrag(e, item, 'parent')}
                className="diagram-palette-item"
                style={{ cursor: 'grab' }}
              >
                <Text ellipsis>{item.title}</Text>
              </List.Item>
            )}
          />
        </Panel>
      </Collapse>
    </div>
  );
}

DiagramPalette.propTypes = {
  nodes: PropTypes.object,
  parents: PropTypes.object,
  search: PropTypes.string,
  onSearchChange: PropTypes.func.isRequired,
  onDragStart: PropTypes.func,
};

DiagramPalette.defaultProps = {
  nodes: {},
  parents: {},
  search: '',
};
