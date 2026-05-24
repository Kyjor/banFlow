import React from 'react';
import PropTypes from 'prop-types';
import {
  AutoComplete,
  Button,
  Divider,
  Drawer,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { CloseOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { SHAPE_VARIANTS } from './utils/diagramDefaults';

const { Text } = Typography;

export default function NodeInspector({
  open,
  node,
  projectName,
  nodes,
  parents,
  onUpdate,
  onDelete,
  onClose,
  onOpenImagePicker,
  onRemoveImage,
  getNodeSuggestions,
  getParentSuggestions,
  onNodeReferenceSelect,
  onParentReferenceSelect,
  onRemoveNodeReference,
  onRemoveParentReference,
}) {
  if (!node) return null;

  const isCustom = node.type === 'custom';
  const isShape = node.type === 'shape';

  return (
    <Drawer title="Edit Node" placement="right" width={350} open={open} onClose={onClose}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong>Label</Text>
          <Input
            value={node.data?.label || ''}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Node label"
          />
        </div>

        {isCustom && (
          <div>
            <Text strong>Description</Text>
            <Input.TextArea
              value={node.data?.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Node description"
              rows={3}
            />
          </div>
        )}

        {(isCustom || isShape) && (
          <>
            <Divider />
            {isShape && (
              <div>
                <Text strong>Shape</Text>
                <Select
                  style={{ width: '100%' }}
                  value={node.data?.shape || 'rectangle'}
                  onChange={(shape) => onUpdate({ shape })}
                  options={SHAPE_VARIANTS.map((s) => ({ value: s, label: s }))}
                />
              </div>
            )}
            <div>
              <Text strong>Background Color</Text>
              <Input
                type="color"
                value={node.data?.color || '#ffffff'}
                onChange={(e) => onUpdate({ color: e.target.value })}
                style={{ width: '100%', height: 40 }}
              />
            </div>
            <div>
              <Text strong>Border Color</Text>
              <Input
                type="color"
                value={node.data?.borderColor || '#d9d9d9'}
                onChange={(e) => onUpdate({ borderColor: e.target.value })}
                style={{ width: '100%', height: 40 }}
              />
            </div>
            {isCustom && (
              <div>
                <Text strong>Sync status color</Text>
                <Switch
                  checked={!!node.data?.syncStatusColor}
                  onChange={(syncStatusColor) =>
                    onUpdate({ syncStatusColor: syncStatusColor || null })
                  }
                />
              </div>
            )}
          </>
        )}

        {isCustom && (
          <>
            <Divider />
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text strong>Image</Text>
                <Space>
                  <Button size="small" icon={<PictureOutlined />} onClick={onOpenImagePicker}>
                    {node.data?.image ? 'Change' : 'Add'} Image
                  </Button>
                  {node.data?.image && (
                    <Button size="small" danger icon={<CloseOutlined />} onClick={onRemoveImage}>
                      Remove
                    </Button>
                  )}
                </Space>
              </div>
              {node.data?.image && (
                <img
                  src={node.data.image}
                  alt="Node"
                  style={{
                    width: '100%',
                    maxHeight: 200,
                    objectFit: 'contain',
                    borderRadius: 4,
                    border: '1px solid #d9d9d9',
                  }}
                />
              )}
            </div>

            <Divider />
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text strong>Node Reference</Text>
                {node.data?.referencedNode && (
                  <Button size="small" danger icon={<CloseOutlined />} onClick={onRemoveNodeReference}>
                    Remove
                  </Button>
                )}
              </div>
              {node.data?.referencedNode ? (
                <Tag
                  color="blue"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const pn = projectName.replace(/\//g, '@');
                    window.location.hash = `#/projectPage/${pn}?node=${node.data.referencedNode.id}`;
                  }}
                >
                  @{node.data.referencedNode.title}
                </Tag>
              ) : (
                <AutoComplete
                  style={{ width: '100%' }}
                  options={getNodeSuggestions('')}
                  onSelect={onNodeReferenceSelect}
                  onSearch={getNodeSuggestions}
                  placeholder="Search for a node..."
                  filterOption={(inputValue, option) =>
                    option.label.toLowerCase().includes(inputValue.toLowerCase())
                  }
                />
              )}
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text strong>Parent Reference</Text>
                {node.data?.referencedParent && (
                  <Button size="small" danger icon={<CloseOutlined />} onClick={onRemoveParentReference}>
                    Remove
                  </Button>
                )}
              </div>
              {node.data?.referencedParent ? (
                <Tag
                  color="green"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const pn = projectName.replace(/\//g, '@');
                    window.location.hash = `#/projectPage/${pn}?parent=${node.data.referencedParent.id}`;
                  }}
                >
                  @{node.data.referencedParent.title}
                </Tag>
              ) : (
                <AutoComplete
                  style={{ width: '100%' }}
                  options={getParentSuggestions('')}
                  onSelect={onParentReferenceSelect}
                  onSearch={getParentSuggestions}
                  placeholder="Search for a parent..."
                  filterOption={(inputValue, option) =>
                    option.label.toLowerCase().includes(inputValue.toLowerCase())
                  }
                />
              )}
            </div>
          </>
        )}

        <Divider />
        <Button danger block icon={<DeleteOutlined />} onClick={onDelete}>
          Delete Node
        </Button>
      </Space>
    </Drawer>
  );
}

NodeInspector.propTypes = {
  open: PropTypes.bool.isRequired,
  node: PropTypes.object,
  projectName: PropTypes.string.isRequired,
  nodes: PropTypes.object,
  parents: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onOpenImagePicker: PropTypes.func,
  onRemoveImage: PropTypes.func,
  getNodeSuggestions: PropTypes.func.isRequired,
  getParentSuggestions: PropTypes.func.isRequired,
  onNodeReferenceSelect: PropTypes.func.isRequired,
  onParentReferenceSelect: PropTypes.func.isRequired,
  onRemoveNodeReference: PropTypes.func.isRequired,
  onRemoveParentReference: PropTypes.func.isRequired,
};
