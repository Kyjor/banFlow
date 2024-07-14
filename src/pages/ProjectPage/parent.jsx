/* eslint-disable react/jsx-props-no-spreading,react-hooks/exhaustive-deps,jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */
import React, { useEffect, useState } from 'react';
import {
  Draggable,
  Droppable,
} from '@atlaskit/pragmatic-drag-and-drop-react-beautiful-dnd-migration';
import { Button } from 'antd';
import PropTypes from 'prop-types';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons';

import Node from './node';
import EditableTextArea from '../../components/EditableTextArea/EditableTextArea';
import styles from './parent.module.scss';
import ParentQuickActions from '../../components/ParentQuickActions/ParentQuickActions';

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
  padding: '15px',
  alignSelf: 'flex-end',
  border: 'none',
  cursor: 'pointer',
  backgroundColor: 'transparent',
};

class ParentInnerList extends React.Component {
  shouldComponentUpdate(nextProps) {
    const { nodes } = this.props;

    return nextProps.nodes !== nodes;
  }

  render() {
    const {
      nodes = {},
      isTimerRunning,
      saveTime,
      selectedIteration,
      updateNodeTitle,
      ...rest
    } = this.props;

    function isInCurrentIteration(node, selectedIteration) {
      if((node.iterationId && node.iterationId == selectedIteration) || (!node.iterationId || node.iterationId == `` )){
        
      }
    }

    return nodes.map((node, index) => (
      <div>
        {node && isInCurrentIteration(node, selectedIteration) && (
          <Node
            isTimerRunning={isTimerRunning}
            key={node.id}
            node={node}
            index={index}
            saveTime={saveTime}
            updateNodeTitle={updateNodeTitle}
            {...rest}
          />
        )}
      </div>
    ));
  }
}

ParentInnerList.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  nodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  saveTime: PropTypes.func.isRequired,
  isTimerRunning: PropTypes.bool.isRequired,
  updateNodeTitle: PropTypes.func.isRequired,
};

function Parent(props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isFirstEdit, setIsFirstEdit] = useState(false);

  const {
    createNewNode,
    deleteNode,
    deleteParent,
    index,
    isTimerRunning,
    mustFocusNodeTitle,
    mustFocusParentTitle,
    nodes,
    parent,
    saveTime,
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
                  updateText={(value) =>
                    (
                      // eslint-disable-next-line no-sequences
                      setIsEditing(false),
                      updateParentProperty('title', parent.id, value)
                    )
                  }
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
            <ParentQuickActions
              key="actions"
              button={<EllipsisOutlined style={parentSettingsButtonStyle} />}
              parent={parent}
              deleteParent={deleteParent}
            />
          </div>
          <Droppable droppableId={parent.id} type="node">
            {/* eslint-disable-next-line @typescript-eslint/no-shadow */}
            {(provided, snapshot) => (
              <div style={{ width: '300px', margin: `inherit` }}>
                <div
                  style={nodeListStyle(snapshot.isDraggingOver)}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <ParentInnerList
                    isTimerRunning={isTimerRunning}
                    nodes={nodes}
                    mustFocusNodeTitle={mustFocusNodeTitle}
                    updateNodeTitle={updateNodeTitle}
                    showModal={showModal}
                    deleteNode={deleteNode}
                    saveTime={saveTime}
                  />
                  {provided.placeholder}
                </div>
                <Button
                  type="primary"
                  block
                  onClick={() => createNewNode(parent.id)}
                  style={{ borderRadius: '10px' }}
                >
                  <PlusOutlined style={{ position: 'relative', top: '-3px' }} />
                  New Node
                </Button>
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
}

export default Parent;

Parent.propTypes = {
  createNewNode: PropTypes.func.isRequired,
  deleteNode: PropTypes.func.isRequired,
  deleteParent: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  isTimerRunning: PropTypes.bool.isRequired,
  mustFocusNodeTitle: PropTypes.bool.isRequired,
  mustFocusParentTitle: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  nodes: PropTypes.any.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parent: PropTypes.any.isRequired,
  saveTime: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  updateParentProperty: PropTypes.func.isRequired,
  updateNodeTitle: PropTypes.func.isRequired,
};
