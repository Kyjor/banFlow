import React, { useEffect, useState } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';
import { Button, Icon, Typography } from 'antd';
import PropTypes from 'prop-types';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons';

import Node from './node';
import EditableTextArea from '../../components/EditableTextArea/EditableTextArea';
import styles from './parent.module.scss';

const TitleContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;
const Title = styled.h3`
  padding: 8px;
`;

const NodeList = styled.div`
  padding: 8px;
  background-color: ${(props) =>
    props.isDraggingOver ? 'skyblue' : 'inherit'};
  flex-grow: 1;
  min-height: 200px;
  max-height: 675px;
  overflow-y: auto;
`;

const ParentSettingsButton = styled.button`
  padding: 5px;
  align-self: end;
  border: none;
  cursor: pointer;
  //background-color: transparent;
`;
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
          <TitleContainer {...provided.dragHandleProps}>
            <Title>
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
            </Title>
            <ParentSettingsButton onClick={() => showParentModal(parent)}>
              <EllipsisOutlined style={{ fontSize: '20px' }} />
            </ParentSettingsButton>
          </TitleContainer>
          <Droppable
            droppableId={parent.id}
            // type={parent.id === 'parent-3' ? 'done' : 'active'}
            type="node"
            // isDropDisabled={ props.isDropDisabled }
          >
            {(provided, snapshot) => (
              <div style={{ width: '300px', margin: `inherit` }}>
                <NodeList
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  isDraggingOver={snapshot.isDraggingOver}
                >
                  <ParentInnerList
                    nodes={nodes}
                    mustFocusNodeTitle={mustFocusNodeTitle}
                    updateNodeTitle={updateNodeTitle}
                    showModal={showModal}
                    deleteNode={deleteNode}
                    saveTime={props.saveTime}
                  />
                  {provided.placeholder}
                </NodeList>
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
