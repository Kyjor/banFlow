import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import ScrollContainer from 'react-indiana-drag-scroll';
import { Button } from 'antd';
import styles from '../../pages/ProjectPage/ProjectPage.module.scss';
import BoardInnerList from '../../pages/ProjectPage/BoardInnerList';
import parentController from '../../api/parent/ParentController';

class KanbanBoard extends Component {
  // eslint-disable-next-line class-methods-use-this
  onDragStart = (start, provided) => {
    provided.announce(
      `You have lifted the node in the position ${start.source.index + 1}`,
    );
    document.body.style.transition = 'background-color 0.2s ease';
  };

  // eslint-disable-next-line class-methods-use-this
  onDragUpdate = (update, provided) => {
    const message = update.destination
      ? `You have moved the node to position ${update.destination.index + 1}`
      : `You are currently not over a droppable area`;
    provided.announce(message);
    // const { destination } = update;
    // const opacity = destination
    //   ? destination.index / Object.keys(this.props.nodes).length
    //   : 0;
  };

  onDragEnd = (result, provided) => {
    const { parentOrder, parents, updateParents } = this.props;
    const message = result.destination
      ? `You have moved the node from position ${result.source.index + 1} to ${
          result.destination.index + 1
        }`
      : `The node has been returned to its starting position of  ${
          result.source.index + 1
        }`;
    provided.announce(message);
    const { destination, source, draggableId, type } = result;

    document.body.style.color = 'inherit';

    if (!destination) {
      return;
    }
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    if (type === 'parent') {
      const newParentOrder = Array.from(parentOrder);
      newParentOrder.splice(source.index, 1);
      newParentOrder.splice(destination.index, 0, draggableId);
      updateParents(() => {
        parentController.updateParentOrder(newParentOrder);
      });

      return;
    }
    const start = parents[source.droppableId];
    const finish = parents[destination.droppableId];

    if (start === finish) {
      const newNodeIds = Array.from(start.nodeIds);
      newNodeIds.splice(source.index, 1);
      newNodeIds.splice(destination.index, 0, draggableId);
      const newParent = {
        ...start,
        nodeIds: newNodeIds,
      };

      updateParents(() => {
        parentController.updateParentProperty(
          'nodeIds',
          newParent.id,
          newParent.nodeIds,
        );
      });

      return;
    }

    const startNodeIds = Array.from(start.nodeIds);
    startNodeIds.splice(source.index, 1);
    const newStart = {
      ...start,
      nodeIds: startNodeIds,
    };

    const finishNodeIds = Array.from(finish.nodeIds);
    finishNodeIds.splice(destination.index, 0, draggableId);
    const newFinish = {
      ...finish,
      nodeIds: finishNodeIds,
    };

    this.props.updateParents(() => {
      parentController.updateNodesInParents(newStart, newFinish, draggableId);
    });
  };

  render() {
    const {
      createNewNode,
      deleteNode,
      handleAddParent,
      isTimerRunning,
      mustFocusNodeTitle,
      mustFocusParentTitle,
      nodes,
      parentOrder,
      parents,
      saveTime,
      showModal,
      showParentModal,
      updateParentProperty,
      updateNodeTitle,
    } = this.props;
    return (
      <DragDropContext
        onDragEnd={this.onDragEnd}
        onDragUpdate={this.onDragUpdate}
        onDragStart={this.onDragStart}
      >
        <Droppable
          droppableId="all-parents"
          direction="horizontal"
          type="parent"
        >
          {(provided) => (
            <ScrollContainer
              ignoreElements="#parent"
              style={{
                width: `100%`,
                overflow: `auto`,
                // backgroundColor: `rgba(125, 132, 152, 0.3)`,
                minHeight: `500px`,
              }}
            >
              <div
                {...provided.droppableProps}
                className={styles.container}
                ref={provided.innerRef}
              >
                {parentOrder.map((parentId, index) => {
                  const parent = parents[parentId];
                  return (
                    parent && (
                      <BoardInnerList
                        className="ignoreParent"
                        createNewNode={createNewNode}
                        deleteNode={deleteNode}
                        index={index}
                        isTimerRunning={isTimerRunning}
                        key={parent.id}
                        mustFocusNodeTitle={mustFocusNodeTitle}
                        mustFocusParentTitle={mustFocusParentTitle}
                        nodeMap={nodes}
                        parent={parent}
                        saveTime={(seconds, nodeId) => {
                          saveTime(`timeSpent`, nodeId, seconds, false);
                        }}
                        showModal={showModal}
                        showParentModal={showParentModal}
                        updateNodeTitle={updateNodeTitle}
                        updateParentProperty={updateParentProperty}
                      />
                    )
                  );
                })}
                {provided.placeholder}
                <Button
                  type="primary"
                  block
                  onClick={handleAddParent}
                  style={{
                    width: `265px`,
                    marginTop: `10px`,
                  }}
                >
                  {/* <PlusOutlined /> */}
                  New Parent
                </Button>
              </div>
            </ScrollContainer>
          )}
        </Droppable>
      </DragDropContext>
    );
  }
}

export default KanbanBoard;

KanbanBoard.propTypes = {
  createNewNode: PropTypes.func.isRequired,
  deleteNode: PropTypes.func.isRequired,
  handleAddParent: PropTypes.func.isRequired,
  isTimerRunning: PropTypes.bool.isRequired,
  mustFocusNodeTitle: PropTypes.bool.isRequired,
  mustFocusParentTitle: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  nodes: PropTypes.array.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parentOrder: PropTypes.array.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parents: PropTypes.array.isRequired,
  saveTime: PropTypes.func.isRequired,
  showModal: PropTypes.bool.isRequired,
  showParentModal: PropTypes.bool.isRequired,
  updateNodeTitle: PropTypes.func.isRequired,
  updateParentProperty: PropTypes.func.isRequired,
  updateParents: PropTypes.func.isRequired,
};
