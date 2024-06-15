/* eslint-disable react-hooks/exhaustive-deps,react/jsx-props-no-spreading */
import React, { useEffect, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card as AntCard } from 'antd';
import PropTypes from 'prop-types';
import { EllipsisOutlined, SettingOutlined } from '@ant-design/icons';
import styles from './node.module.scss';
import EditableTextArea from '../../components/EditableTextArea/EditableTextArea';
import StopWatch from '../../components/StopWatch/StopWatch';
import NodeQuickActions from '../../components/NodeQuickActions/NodeQuickActions';

const { Meta } = AntCard;

function ItemRender(props) {
  const { nodeId, saveTime } = props;

  return (
    <StopWatch
      clickToToggle
      nodeId={nodeId}
      saveTime={saveTime}
      startingSeconds={0}
    />
  );
}

ItemRender.propTypes = {
  nodeId: PropTypes.string.isRequired,
  saveTime: PropTypes.func.isRequired,
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
    saveTime,
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
              // open modal
              <SettingOutlined onClick={() => handleOpen(node)} />,
              <ItemRender key="time" s saveTime={saveTime} nodeId={node.id} />,
              // edit title
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
              description={node.description}
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
