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
      deleteParent,
      isTimerRunning,
      saveTime,
      selectedIteration,
      showModal,
      showParentModal,
      updateNodeTitle,
      filterNode,
      updateParentProperty,
    } = this.props;
    return (
      <Parent
        createNewNode={createNewNode}
        deleteNode={deleteNode}
        deleteParent={deleteParent}
        index={index}
        isTimerRunning={isTimerRunning}
        mustFocusNodeTitle={mustFocusNodeTitle}
        mustFocusParentTitle={mustFocusParentTitle}
        nodes={nodes}
        parent={parent}
        saveTime={saveTime}
        selectedIteration={selectedIteration}
        showModal={showModal}
        showParentModal={showParentModal}
        updateNodeTitle={updateNodeTitle}
        filterNode={filterNode}
        updateParentProperty={updateParentProperty}
      />
    );
  }
}

BoardInnerList.propTypes = {
  createNewNode: PropTypes.func.isRequired,
  // eslint-disable-next-line react/require-default-props
  deleteNode: PropTypes.func.isRequired,
  deleteParent: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  isTimerRunning: PropTypes.bool.isRequired,
  mustFocusNodeTitle: PropTypes.bool.isRequired,
  mustFocusParentTitle: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  nodeMap: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parent: PropTypes.object.isRequired,
  saveTime: PropTypes.func.isRequired,
  selectedIteration: PropTypes.string.isRequired,
  showModal: PropTypes.func.isRequired,
  showParentModal: PropTypes.func,
  updateNodeTitle: PropTypes.func.isRequired,
  filterNode: PropTypes.func,
  updateParentProperty: PropTypes.func.isRequired,
};

BoardInnerList.defaultProps = {
  showParentModal: () => {},
  filterNode: () => {},
};

export default BoardInnerList;
