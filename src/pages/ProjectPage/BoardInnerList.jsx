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
      saveTime,
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
        saveTime={saveTime}
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
  // eslint-disable-next-line react/require-default-props
  deleteNode: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  isTimerRunning: PropTypes.bool.isRequired,
  mustFocusNodeTitle: PropTypes.bool.isRequired,
  mustFocusParentTitle: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  nodeMap: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  parent: PropTypes.object.isRequired,
  saveTime: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  showParentModal: PropTypes.func.isRequired,
  updateNodeTitle: PropTypes.func.isRequired,
  updateParentProperty: PropTypes.func.isRequired,
};

export default BoardInnerList;
