import React, { useEffect, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card as AntCard } from 'antd';
import PropTypes from 'prop-types';
import {
  EllipsisOutlined,
  PlayCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import styles from './node.module.scss';
import EditableTextArea from '../../components/EditableTextArea/EditableTextArea';
import StopWatch from '../../components/StopWatch/StopWatch';
import NodeQuickActions from '../../components/NodeQuickActions/NodeQuickActions';

const { Meta } = AntCard;

function Node(props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isFirstEdit, setIsFirstEdit] = useState(false);
  const [isRecordingTime, setIsRecordingTime] = useState(false);

  const handleOpen = (NodeTitle) => {
    props.showModal(NodeTitle);
  };
  const handleDelete = (nodeId, parentId) => {
    props.deleteNode(nodeId, parentId);
  };
  const handleEdit = () => {
    setIsEditing(!isEditing);
  };
  const handleToggle = () => {
    setIsRecordingTime(!isRecordingTime);
  };
  useEffect(() => {
    if (props.mustFocusNodeTitle) {
      setIsFirstEdit(true);
    }
  }, []);

  useEffect(() => {
    if (!props.mustFocusNodeTitle && isFirstEdit) {
      setIsFirstEdit(false);
    }
  }, [props.mustFocusNodeTitle]);

  const isDragDisabled = props.node.isLocked;
  const { node } = props;

  return (
    <Draggable
      draggableId={node.id}
      index={props.index}
      isDragDisabled={isDragDisabled || props.isTimerRunning}
    >
      {(provided, snapshot) => (
        <div
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
        >
          <AntCard
            className={styles.container}
            bodyStyle={{ whiteSpace: 'inherit', display: `flex` }}
            hoverable
            // style={{ width: "290px" }}
            cover={
              node.coverImage && <img alt="example" src={node.coverImage} />
            }
            actions={[
              // open modal
              <SettingOutlined onClick={() => handleOpen(node)} />,
              <ItemRender
                key="time"
                // onToggle={handleToggle}
                startingSeconds={node.timeSpent}
                saveTime={props.saveTime}
                nodeId={node.id}
              />,
              // edit title
              <NodeQuickActions
                key="actions"
                button={<EllipsisOutlined />}
                node={node}
                deleteNode={handleDelete}
              />,
            ]}
          >
            {isRecordingTime ? (
              <PlayCircleOutlined
                style={{ marginRight: `5px`, color: 'red' }}
              />
            ) : null}
            <Meta
              // avatar={<Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />}
              title={
                isEditing || isFirstEdit ? (
                  <EditableTextArea
                    editing={isEditing || isFirstEdit}
                    defaultValue={node.title}
                    // showCount={this.state.modalNotesSelected}
                    maxLength={100}
                    autoSize={{ minRows: 3 }}
                    style={{
                      marginBottom: '10px',
                      // backgroundColor: this.node.notes ? `transparent` : `#eeeeee`,
                      // backgroundColor: `#eeeeee`,
                    }}
                    placeholder="Add node title here..."
                    updateText={(value) => (
                      setIsEditing(false),
                      props.updateNodeTitle(value, node.id, false)
                    )}
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

function ItemRender(props) {
  const [isHovering, setIsHovering] = useState(false);

  function handleHover() {}

  return (
    <div
      onMouseOver={(e) => {
        setIsHovering(true);
      }}
      onMouseLeave={(e) => {
        setIsHovering(false);
      }}
    >
      <StopWatch
        clickToToggle
        onToggle={props.onToggle}
        startingSeconds={props.startingSeconds}
        saveTime={props.saveTime}
        nodeId={props.nodeId}
      />
    </div>
  );
}

Node.propTypes = {
  node: PropTypes.object,
  onToggle: PropTypes.bool,
  startingSeconds: PropTypes.number,
};

export default Node;
