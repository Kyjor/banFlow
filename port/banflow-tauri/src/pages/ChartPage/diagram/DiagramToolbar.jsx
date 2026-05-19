import React from 'react';
import PropTypes from 'prop-types';
import { Button, Divider, Select, Space, Switch, Tooltip, Typography } from 'antd';
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BorderOutlined,
  ColumnHeightOutlined,
  ColumnWidthOutlined,
  CopyOutlined,
  DragOutlined,
  EditOutlined,
  ExportOutlined,
  FontSizeOutlined,
  LineOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  RedoOutlined,
  SaveOutlined,
  StrikethroughOutlined,
  UndoOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { EDGE_TYPES, TOOLS } from './utils/diagramDefaults';

const { Text } = Typography;

const toolButtons = [
  { key: TOOLS.SELECT, icon: <DragOutlined />, title: 'Select (V)' },
  { key: TOOLS.PAN, icon: <ColumnWidthOutlined />, title: 'Pan (H)' },
  { key: TOOLS.CONNECTOR, icon: <NodeIndexOutlined />, title: 'Connector (C)' },
  { key: TOOLS.SHAPE, icon: <BorderOutlined />, title: 'Shape' },
  { key: TOOLS.TEXT, icon: <FontSizeOutlined />, title: 'Text (T)' },
  { key: TOOLS.STICKY, icon: <EditOutlined />, title: 'Sticky (N)' },
  { key: TOOLS.PEN, icon: <LineOutlined />, title: 'Pen (P)' },
  { key: TOOLS.CARD, icon: <PlusOutlined />, title: 'Card' },
];

export default function DiagramToolbar({
  activeTool,
  onToolChange,
  shapeVariant,
  onShapeVariantChange,
  defaultEdgeType,
  onDefaultEdgeTypeChange,
  gridSnap,
  onGridSnapChange,
  isDirty,
  autosaveEnabled,
  onAutosaveChange,
  onSave,
  onFitView,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDuplicate,
  onAlign,
  onAutoLayout,
  onExportPng,
}) {
  return (
    <div className="diagram-toolbar">
      <Space wrap size="small">
        {toolButtons.map(({ key, icon, title }) => (
          <Tooltip key={key} title={title}>
            <Button
              type={activeTool === key ? 'primary' : 'default'}
              size="small"
              icon={icon}
              onClick={() => onToolChange(key)}
            />
          </Tooltip>
        ))}

        {activeTool === TOOLS.SHAPE && (
          <Select
            size="small"
            style={{ width: 120 }}
            value={shapeVariant}
            onChange={onShapeVariantChange}
            options={[
              'rectangle',
              'rounded',
              'diamond',
              'circle',
              'parallelogram',
            ].map((s) => ({ value: s, label: s }))}
          />
        )}

        <Divider type="vertical" />

        <Text type="secondary" style={{ fontSize: 12 }}>
          Edge
        </Text>
        <Select
          size="small"
          style={{ width: 110 }}
          value={defaultEdgeType}
          onChange={onDefaultEdgeTypeChange}
          options={EDGE_TYPES.map((t) => ({ value: t, label: t }))}
        />

        <Tooltip title="Snap to grid">
          <Switch size="small" checked={gridSnap} onChange={onGridSnapChange} />
        </Tooltip>

        <Divider type="vertical" />

        <Tooltip title="Undo (Ctrl+Z)">
          <Button size="small" icon={<UndoOutlined />} disabled={!canUndo} onClick={onUndo} />
        </Tooltip>
        <Tooltip title="Redo (Ctrl+Y)">
          <Button size="small" icon={<RedoOutlined />} disabled={!canRedo} onClick={onRedo} />
        </Tooltip>
        <Tooltip title="Duplicate (Ctrl+D)">
          <Button size="small" icon={<CopyOutlined />} onClick={onDuplicate} />
        </Tooltip>

        <Divider type="vertical" />

        <Tooltip title="Align left">
          <Button size="small" icon={<AlignLeftOutlined />} onClick={() => onAlign('left')} />
        </Tooltip>
        <Tooltip title="Align center">
          <Button size="small" icon={<AlignCenterOutlined />} onClick={() => onAlign('centerH')} />
        </Tooltip>
        <Tooltip title="Align right">
          <Button size="small" icon={<AlignRightOutlined />} onClick={() => onAlign('right')} />
        </Tooltip>
        <Tooltip title="Align top">
          <Button size="small" icon={<VerticalAlignTopOutlined />} onClick={() => onAlign('top')} />
        </Tooltip>
        <Tooltip title="Align middle">
          <Button
            size="small"
            icon={<VerticalAlignMiddleOutlined />}
            onClick={() => onAlign('centerV')}
          />
        </Tooltip>
        <Tooltip title="Align bottom">
          <Button
            size="small"
            icon={<VerticalAlignBottomOutlined />}
            onClick={() => onAlign('bottom')}
          />
        </Tooltip>

        <Divider type="vertical" />

        <Button size="small" onClick={onFitView}>
          Fit
        </Button>
        <Button size="small" onClick={onAutoLayout}>
          Layout
        </Button>
        <Button size="small" icon={<ExportOutlined />} onClick={onExportPng}>
          PNG
        </Button>

        <Divider type="vertical" />

        <Text type="secondary" style={{ fontSize: 12 }}>
          Autosave
        </Text>
        <Switch size="small" checked={autosaveEnabled} onChange={onAutosaveChange} />
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          onClick={onSave}
          disabled={!isDirty}
        >
          Save
        </Button>
      </Space>
    </div>
  );
}

DiagramToolbar.propTypes = {
  activeTool: PropTypes.string.isRequired,
  onToolChange: PropTypes.func.isRequired,
  shapeVariant: PropTypes.string.isRequired,
  onShapeVariantChange: PropTypes.func.isRequired,
  defaultEdgeType: PropTypes.string.isRequired,
  onDefaultEdgeTypeChange: PropTypes.func.isRequired,
  gridSnap: PropTypes.bool.isRequired,
  onGridSnapChange: PropTypes.func.isRequired,
  isDirty: PropTypes.bool.isRequired,
  autosaveEnabled: PropTypes.bool.isRequired,
  onAutosaveChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onFitView: PropTypes.func.isRequired,
  onUndo: PropTypes.func.isRequired,
  onRedo: PropTypes.func.isRequired,
  canUndo: PropTypes.bool.isRequired,
  canRedo: PropTypes.bool.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onAlign: PropTypes.func.isRequired,
  onAutoLayout: PropTypes.func.isRequired,
  onExportPng: PropTypes.func.isRequired,
};
