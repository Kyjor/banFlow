import React, { useEffect, useState } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Button, Icon, Typography } from 'antd';
import PropTypes from 'prop-types';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons';

import Node from './node';
import EditableTextArea from '../../components/EditableTextArea/EditableTextArea';
import styles from './parent.module.scss';

const titleContainerStyle = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
};

const nodeListStyle = (isDraggingOver) => {
  return {
    padding: '8px',
    backgroundColor: isDraggingOver ? 'skyblue' : 'inherit',
    flexGrow: 1,
    minHeight: '200px',
    maxHeight: '675px',
    overflowY: 'auto',
  };
};

const parentSettingsButtonStyle = {
  padding: '5px',
  alignSelf: 'flex-end',
  border: 'none',
  cursor: 'pointer',
  // backgroundColor: 'transparent',
};

class ParentInnerList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editing: false,
    };
  }

  shouldComponentUpdate(nextProps) {
    if (nextProps.nodes === this.props.nodes) {
      return false;
    }
    return true;
  }

  render() {
    const { nodes = {}, ...rest } = this.props;
    return nodes.map((node, index) => (
      <>
        {node && (
          <Node
            isTimerRunning={this.props.isTimerRunning}
            key={node.id}
            node={node}
            index={index}
            saveTime={this.props.saveTime}
            {...rest}
          />
        )}
      </>
    ));
  }
}

const Parent = (props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isFirstEdit, setIsFirstEdit] = useState(false);

  const {
    nodes,
    parent,
    createNewNode,
    deleteNode,
    index,
    mustFocusNodeTitle,
    mustFocusParentTitle,
    showParentModal,
    showModal,
    updateNodeTitle,
    updateParentProperty,
  } = props;

  useEffect(() => {
    if (mustFocusParentTitle) {
      setIsFirstEdit(true);
    }
  }, []);

  useEffect(() => {
    if (!mustFocusParentTitle && isFirstEdit) {
      setIsFirstEdit(false);
    }
  }, [mustFocusParentTitle]);
  return (
    <Draggable
      draggableId={parent.id}
      index={index}
      style={{ minWidth: '300px' }}
    >
      {(provided) => (
        <div
          className={styles.container}
          id="parent"
          {...provided.draggableProps}
          ref={provided.innerRef}
          // Do not place styles in here. It will break the dragging animation
        >
          <div style={titleContainerStyle} {...provided.dragHandleProps}>
            <h3 style={{ padding: '8px' }}>
              {isEditing || isFirstEdit ? (
                <EditableTextArea
                  editing={isEditing || isFirstEdit}
                  defaultValue={parent.title}
                  // showCount={this.state.modalNotesSelected}
                  maxLength={100}
                  autoSize={{ minRows: 1, maxRows: 1 }}
                  style={{
                    width: '250px',
                    resize: 'none',
                    height: '22px',
                    border: 'none',
                  }}
                  placeholder="Add node title here..."
                  updateText={(value) => (
                    setIsEditing(false),
                    updateParentProperty('title', parent.id, value)
                  )}
                />
              ) : (
                <span
                  style={{ whiteSpace: 'normal' }}
                  onClick={() => setIsEditing(true)}
                >
                  {parent.title}
                </span>
              )}
            </h3>
            <button
              style={parentSettingsButtonStyle}
              onClick={() => showParentModal(parent)}
            >
              <EllipsisOutlined style={{ fontSize: '20px' }} />
            </button>
          </div>
          <Droppable
            droppableId={parent.id}
            // type={parent.id === 'parent-3' ? 'done' : 'active'}
            type="node"
            // isDropDisabled={ props.isDropDisabled }
          >
            {(provided, snapshot) => (
              <div style={{ width: '300px', margin: `inherit` }}>
                <div
                  style={nodeListStyle(snapshot.isDraggingOver)}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <ParentInnerList
                    isTimerRunning={props.isTimerRunning}
                    nodes={nodes}
                    mustFocusNodeTitle={mustFocusNodeTitle}
                    updateNodeTitle={updateNodeTitle}
                    showModal={showModal}
                    deleteNode={deleteNode}
                    saveTime={props.saveTime}
                  />
                  {provided.placeholder}
                </div>
                <Button
                  type="primary"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => createNewNode(parent.id)}
                >
                  New Node
                </Button>
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
};

export default Parent;

Parent.propTypes = {
  createNewNode: PropTypes.func.isRequired,
  deleteNode: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  mustFocusNodeTitle: PropTypes.bool.isRequired,
  mustFocusParentTitle: PropTypes.bool.isRequired,
  nodes: PropTypes.any.isRequired,
  parent: PropTypes.any.isRequired,
  saveTime: PropTypes.func.isRequired,
  showParentModal: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  updateParentProperty: PropTypes.func.isRequired,
  updateNodeTitle: PropTypes.func.isRequired,
};
