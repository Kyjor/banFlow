import React from 'react';
import PropTypes from 'prop-types';
import { Button, Divider, Input, Select, Space, Switch, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { EDGE_TYPES } from './utils/diagramDefaults';

const { Text } = Typography;

export default function EdgeInspector({
  edge,
  onUpdate,
  onDelete,
  onClose,
}) {
  if (!edge) return null;

  const data = edge.data || {};

  return (
    <div className="diagram-inspector diagram-edge-inspector">
      <div className="diagram-inspector-header">
        <Text strong>Edge</Text>
        <Button type="text" size="small" onClick={onClose}>
          Close
        </Button>
      </div>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong>Type</Text>
          <Select
            style={{ width: '100%' }}
            value={edge.type || 'straight'}
            onChange={(type) => onUpdate({ type })}
            options={EDGE_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </div>
        <div>
          <Text strong>Label</Text>
          <Input
            value={data.label || ''}
            onChange={(e) =>
              onUpdate({ data: { ...data, label: e.target.value } })
            }
            placeholder="Edge label"
          />
        </div>
        <div>
          <Text strong>Color</Text>
          <Input
            type="color"
            value={data.strokeColor || '#595959'}
            onChange={(e) =>
              onUpdate({ data: { ...data, strokeColor: e.target.value } })
            }
            style={{ width: '100%', height: 36 }}
          />
        </div>
        <div>
          <Text strong>Animated</Text>
          <Switch
            checked={!!edge.animated}
            onChange={(animated) => onUpdate({ animated })}
          />
        </div>
        <div>
          <Text strong>Arrow</Text>
          <Switch
            checked={!!edge.markerEnd}
            onChange={(hasArrow) =>
              onUpdate({
                markerEnd: hasArrow ? { type: 'arrowclosed' } : undefined,
              })
            }
          />
        </div>
        <Divider />
        <Button danger block icon={<DeleteOutlined />} onClick={onDelete}>
          Delete Edge
        </Button>
      </Space>
    </div>
  );
}

EdgeInspector.propTypes = {
  edge: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

EdgeInspector.defaultProps = {
  edge: null,
};
