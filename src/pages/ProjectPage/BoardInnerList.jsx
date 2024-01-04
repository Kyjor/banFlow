import React from 'react';
import PropTypes from 'prop-types';
import Parent from './parent';

class BoardInnerList extends React.PureComponent {
  render() {
    const { parent, nodeMap, index, mustFocusNodeTitle, mustFocusParentTitle } =
      this.props;

    const nodes = parent.nodeIds.map((nodeId) => nodeMap[nodeId]);
    const {
      createNewNode,
      deleteNode,
      isTimerRunning,
      showParentModal,
      showModal,
      updateNodeTitle,
      updateParentProperty,
    } = this.props;
    return (
      <Parent
        parent={parent}
        nodes={nodes}
        index={index}
        createNewNode={createNewNode}
        isTimerRunning={isTimerRunning}
        mustFocusNodeTitle={mustFocusNodeTitle}
        saveTime={this.props.saveTime}
        mustFocusParentTitle={mustFocusParentTitle}
        showParentModal={showParentModal}
        showModal={showModal}
        deleteNode={deleteNode}
        updateNodeTitle={updateNodeTitle}
        updateParentProperty={updateParentProperty}
      />
    );
  }
}

BoardInnerList.propTypes = {
  createNewNode: PropTypes.func.isRequired,
  deleteNode: PropTypes.func,
  index: PropTypes.func.isRequired,
  mustFocusNodeTitle: PropTypes.bool.isRequired,
  mustFocusParentTitle: PropTypes.bool.isRequired,
  nodeMap: PropTypes.array,
  parent: PropTypes.object.isRequired,
  saveTime: PropTypes.func,
  showModal: PropTypes.func.isRequired,
  showParentModal: PropTypes.func.isRequired,
  updateNodeTitle: PropTypes.func.isRequired,
  updateParentProperty: PropTypes.func.isRequired,
};

export default BoardInnerList;
