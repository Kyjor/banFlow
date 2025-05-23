/* eslint-disable react-hooks/exhaustive-deps,react/jsx-props-no-spreading */
import React, { useEffect, useState } from 'react';
import { Draggable } from '@atlaskit/pragmatic-drag-and-drop-react-beautiful-dnd-migration';
import { Card as AntCard, Tag, Tooltip } from 'antd';
import PropTypes from 'prop-types';
import { EllipsisOutlined, SettingOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import styles from './node.module.scss';
import EditableTextArea from '../../components/EditableTextArea/EditableTextArea';
import StopWatch from '../../components/StopWatch/StopWatch';
import NodeQuickActions from '../../components/NodeQuickActions/NodeQuickActions';

const { Meta } = AntCard;

function ItemRender(props) {
  const { seconds } = props;

  return <StopWatch clickToToggle startingSeconds={seconds} />;
}

ItemRender.propTypes = {
  seconds: PropTypes.number.isRequired,
};

function Node(props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isFirstEdit, setIsFirstEdit] = useState(false);
  const {
    deleteNode,
    index,
    isTimerRunning,
    mustFocusNodeTitle,
    node,
    showModal,
    updateNodeTitle,
  } = props;

  const handleOpen = (NodeTitle) => {
    showModal(NodeTitle);
  };
  const handleDelete = (nodeId, parentId) => {
    deleteNode(nodeId, parentId);
  };

  useEffect(() => {
    if (mustFocusNodeTitle) {
      setIsFirstEdit(true);
    }
  }, []);

  useEffect(() => {
    if (!mustFocusNodeTitle && isFirstEdit) {
      setIsFirstEdit(false);
    }
  }, [mustFocusNodeTitle]);

  const isDragDisabled = node.isLocked;

  const renderDueDate = () => {
    if (!node.dueDate) return null;
    
    const dueDate = new Date(node.dueDate);
    const isOverdue = dueDate < new Date();
    
    return (
      <Tooltip title={`Due: ${dueDate.toLocaleString()}`}>
        <Tag 
          icon={<ClockCircleOutlined />} 
          color={isOverdue ? 'red' : 'blue'}
          style={{ marginTop: '8px' }}
        >
          {dueDate.toLocaleDateString()}
        </Tag>
      </Tooltip>
    );
  };

  const renderLabels = () => {
    if (!node.labels || node.labels.length === 0) return null;
    
    return (
      <div style={{ marginTop: '8px' }}>
        {node.labels.map((label) => (
          <Tag key={label.id} color={label.color}>
            {label.name}
          </Tag>
        ))}
      </div>
    );
  };

  const renderChecklistProgress = () => {
    if (!node.checklist || node.checklist.checks.length === 0) return null;
    
    const completed = node.checklist.checks.filter(check => check.complete).length;
    const total = node.checklist.checks.length;
    const percentage = Math.round((completed / total) * 100);
    
    return (
      <Tooltip title={`${completed}/${total} items completed`}>
        <Tag 
          icon={<CheckCircleOutlined />} 
          color={percentage === 100 ? 'green' : 'blue'}
          style={{ marginTop: '8px' }}
        >
          {percentage}%
        </Tag>
      </Tooltip>
    );
  };

  return (
    <Draggable
      draggableId={node.id}
      index={index}
      isDragDisabled={isDragDisabled || isTimerRunning}
    >
      {(provided) => (
        <div
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
        >
          <AntCard
            className={styles.container}
            bodyStyle={{ whiteSpace: 'inherit', display: `flex` }}
            hoverable
            cover={
              node.coverImage && <img alt="example" src={node.coverImage} />
            }
            actions={[
              <SettingOutlined onClick={() => handleOpen(node)} />,
              <ItemRender key="time" seconds={node.timeSpent} />,
              <NodeQuickActions
                key="actions"
                button={<EllipsisOutlined />}
                node={node}
                deleteNode={handleDelete}
              />,
            ]}
          >
            <Meta
              title={
                isEditing || isFirstEdit ? (
                  <EditableTextArea
                    editing={isEditing || isFirstEdit}
                    defaultValue={node.title}
                    maxLength={100}
                    autoSize={{ minRows: 3 }}
                    style={{
                      marginBottom: '10px',
                    }}
                    placeholder="Add node title here..."
                    updateText={(value) =>
                      (
                        // eslint-disable-next-line no-sequences
                        setIsEditing(false),
                        updateNodeTitle(value, node.id, false)
                      )
                    }
                  />
                ) : (
                  <span style={{ whiteSpace: 'normal', pointerEvents: 'none' }}>
                    {node.title}
                  </span>
                )
              }
              description={
                <>
                  {node.description}
                  {renderLabels()}
                  {renderDueDate()}
                  {renderChecklistProgress()}
                </>
              }
            />
          </AntCard>
        </div>
      )}
    </Draggable>
  );
}

Node.propTypes = {
  deleteNode: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  isTimerRunning: PropTypes.bool.isRequired,
  mustFocusNodeTitle: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
  saveTime: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  updateNodeTitle: PropTypes.func.isRequired,
};

export default Node;
