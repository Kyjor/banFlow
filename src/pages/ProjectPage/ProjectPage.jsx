// Libs
import React, { Component } from 'react';
// Layouts
import { ipcRenderer } from 'electron';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { createSharedStore } from 'electron-shared-state';
import Layout from '../../layouts/App';
// Components
import NodeModal from '../../components/NodeModal/NodeModal';
import ParentModal from '../../components/ParentModal/ParentModal';
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard';

import {
  // eslint-disable-next-line import/named
  controllers,
  // eslint-disable-next-line import/named
  defaultTimerPreferences,
  // eslint-disable-next-line import/named
  initialIndividualProjectState,
  // eslint-disable-next-line import/named
  lokiService,
} from '../../stores/shared';

const sharedIndividualProjectState = createSharedStore(
  initialIndividualProjectState,
);
const sharedControllers = createSharedStore(controllers);
const sharedTimerPrefs = createSharedStore(defaultTimerPreferences);
const sharedLokiService = createSharedStore(lokiService);

class ProjectPage extends Component {
  constructor(props) {
    super(props);

    const { match } = this.props;

    this.projectName = match.params.name;
    // if projectname contains @ symbols, replace them with slashes
    this.projectName = this.projectName.replace(/[@]/g, '/');

    this.state = {
      ...sharedIndividualProjectState.getState(),
      currentProjectName: this.projectName,
    };
    sharedIndividualProjectState.subscribe((state) => {
      this.setState(state);
    });
  }

  componentDidMount() {
    const { lokiLoaded } = this.state;

    if (!lokiLoaded) {
      sharedControllers
        .getState()
        .projectController.setCurrentProjectName(this.projectName);
      sharedLokiService.getState().lokiService.init(() => {
        this.lokiServiceLoadedCallback();
        sharedIndividualProjectState.setState((state) => {
          state.lokiLoaded = true;
        });
      });
    }
  }

  componentWillUnmount() {
    sharedIndividualProjectState.setState((state) => {
      state.lokiLoaded = false;
    });

    console.log('unmounting');
    // todo: close timer window
  }

  lokiServiceLoadedCallback = () => {
    const { nodeStates, nodeTypes, tags } =
      sharedLokiService.getState().lokiService;

    const nodeTypeList = nodeTypes.find({ Id: { $ne: null } });
    const nodeTypeArray = [];
    const nodeStateList = nodeStates.find({ Id: { $ne: null } });
    const nodeStateArray = [];
    const tagList = tags.find({ Id: { $ne: null } });
    const tagArray = [];

    nodeTypeList.forEach((thisNodeType) => {
      nodeTypeArray.push(thisNodeType.title);
    });
    nodeStateList.forEach((thisNodeState) => {
      nodeStateArray.push(thisNodeState.title);
    });
    tagList.forEach((thisTag) => {
      tagArray.push(thisTag.title);
    });

    const newState = {
      ...this.state,
      nodes: sharedControllers.getState().nodeController.getNodes(),
      parents: sharedControllers.getState().parentController.getParents(),
      parentOrder: sharedControllers
        .getState()
        .parentController.getParentOrder(),
      nodeTypes: nodeTypeArray,
      nodeStates: nodeStateArray,
      tags: tagArray,
      timerPreferences: sharedControllers
        .getState()
        .timerController.getTimerPreferences(),
    };

    sharedIndividualProjectState.setState((state) => {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  createNewParent = (parentTitle) => {
    sharedControllers.getState().parentController.createParent(parentTitle);

    const newState = {
      ...this.state,
      parents: sharedControllers.getState().parentController.getParents(),
      parentOrder: sharedControllers
        .getState()
        .parentController.getParentOrder(),
      mustFocusParentTitle: true,
    };
    sharedIndividualProjectState.setState((state) => {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  createNewNode = (parentId) => {
    const newTitle = `New Node`;
    sharedControllers
      .getState()
      .nodeController.createNode('child', newTitle, parentId);

    const newState = {
      ...this.state,
      nodes: sharedControllers.getState().nodeController.getNodes(),
      parents: sharedControllers.getState().parentController.getParents(),
      mustFocusNodeTitle: true,
    };
    sharedIndividualProjectState.setState((state) => {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  saveMetadataValue = (newValue, parentEnum) => {
    const { nodeTypes, nodeStates } = this.state;

    let newState = {};
    const newEnumObj = sharedControllers
      .getState()
      .metadataController.saveMetadataValue(newValue, parentEnum);
    switch (parentEnum) {
      case 'nodeType':
        newState = {
          ...this.state,
          nodeTypes: [...nodeTypes, newEnumObj.title],
        };
        break;
      case 'nodeState':
        newState = {
          ...this.state,
          nodeStates: [...nodeStates, newEnumObj.title],
        };
        break;
      default:
        break;
    }

    sharedIndividualProjectState.setState((state) => {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  updateNodeEnum = (newValue, parentEnum, node) => {
    this.updateNodeProperty(parentEnum, node.id, newValue, true);
  };

  addTagToNode = (tags, nodeId) => {
    this.updateNodeProperty(`tags`, nodeId, tags, true);
  };

  createGlobalTag = (tag) => {
    const { tags } = this.state;
    const newTag = sharedControllers.getState().tagController.addTag(tag);
    const newTags = [...tags, newTag.title];
    sharedIndividualProjectState.setState((state) => {
      state.tags = newTags;
    });
  };

  updateNodeTitle = (newTitle, nodeId, isModalNode = true) => {
    this.updateNodeProperty(`title`, nodeId, newTitle, isModalNode);
    sharedIndividualProjectState.setState((state) => {
      state.mustFocusNodeTitle = false;
    });
  };

  // eslint-disable-next-line class-methods-use-this
  showParentModal = (parent) => {
    sharedIndividualProjectState.setState((state) => {
      state.parentModalVisible = true;
      state.modalParent = parent;
    });
  };

  // eslint-disable-next-line class-methods-use-this
  showModal = (node) => {
    sharedIndividualProjectState.setState((state) => {
      state.nodeModalVisible = true;
      state.modalNode = node;
    });
  };

  deleteNode = (nodeId, parentId) => {
    sharedControllers.getState().nodeController.deleteNode(nodeId, parentId);

    const newState = {
      ...this.state,
      nodes: sharedControllers.getState().nodeController.getNodes(),
      parents: sharedControllers.getState().parentController.getParents(),
    };

    sharedIndividualProjectState.setState((state) => {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  deleteParent = () => {
    const { modalParent } = this.state;

    sharedControllers.getState().parentController.deleteParent(modalParent.id);

    const newState = {
      ...this.state,
      parents: sharedControllers.getState().parentController.getParents(),
      parentOrder: sharedControllers
        .getState()
        .parentController.getParentOrder(),
      parentModalVisible: false,
      modalParent: null,
    };

    sharedIndividualProjectState.setState((state) => {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  handleOk = () => {
    const { modalNode } = this.state;

    sharedIndividualProjectState.setState((state) => {
      state.currentNodeSelectedInTimer = modalNode.id;
    });
    ipcRenderer.send(
      'MSG_FROM_RENDERER',
      modalNode,
      this.projectName,
      sharedIndividualProjectState.getState(),
      sharedTimerPrefs.getState(),
    );
    // TODO: don't persist this
    sharedIndividualProjectState.setState((state) => {
      state.nodeModalVisible = false;
    });
  };

  // eslint-disable-next-line class-methods-use-this
  handleCancel = () => {
    sharedIndividualProjectState.setState((state) => {
      state.parentModalVisible = false;
      state.nodeModalVisible = false;
      state.modalNode = null;
      state.modalParent = null;
    });
  };

  // eslint-disable-next-line class-methods-use-this
  updateNodeProperty = (propertyToUpdate, nodeId, newValue, isFromModal) => {
    const newNode = sharedControllers
      .getState()
      .nodeController.updateNodeProperty(propertyToUpdate, nodeId, newValue);

    sharedIndividualProjectState.setState((state) => {
      state.nodes = sharedControllers.getState().nodeController.getNodes();
      state.modalNode = isFromModal ? newNode : null;
    });
  };

  // eslint-disable-next-line class-methods-use-this
  updateParentProperty = (
    propertyToUpdate,
    parentId,
    newValue,
    isFromModal,
  ) => {
    const newParent = sharedControllers
      .getState()
      .parentController.updateParentProperty(
        propertyToUpdate,
        parentId,
        newValue,
      );

    sharedIndividualProjectState.setState((state) => {
      state.parents = sharedControllers
        .getState()
        .parentController.getParents();
      state.modalParent = isFromModal ? newParent : null;
    });
  };

  updateParents = (controllerFunction) => {
    controllerFunction();
    const currentState = this.state;

    const newState = {
      ...currentState,
      parents: sharedControllers.getState().parentController.getParents(),
      parentOrder: sharedControllers
        .getState()
        .parentController.getParentOrder(),
    };

    sharedIndividualProjectState.setState((state) => {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  render() {
    const {
      isTimerRunning,
      lokiLoaded,
      modalNode,
      modalParent,
      mustFocusNodeTitle,
      mustFocusParentTitle,
      nodeModalVisible,
      nodes,
      nodeStates,
      nodeTypes,
      parentModalVisible,
      parentOrder,
      parents,
      tags,
    } = this.state;

    return lokiLoaded ? (
      <Layout>
        <div>{this.projectName}</div>
        <div>
          {modalNode && (
            <NodeModal
              addTagToNode={this.addTagToNode}
              node={modalNode}
              parents={parents}
              saveMetadataValue={this.saveMetadataValue}
              createGlobalTag={this.createGlobalTag}
              updateNodeEnum={this.updateNodeEnum}
              handleOk={this.handleOk}
              handleCancel={this.handleCancel}
              tags={tags}
              nodeTypes={nodeTypes}
              nodeStates={nodeStates}
              updateNodeProperty={this.updateNodeProperty}
              visible={nodeModalVisible}
            />
          )}
        </div>
        <div>
          {modalParent && (
            <ParentModal
              parent={modalParent}
              deleteParent={this.deleteParent}
              handleCancel={this.handleCancel}
              updateParentProperty={this.updateParentProperty}
              visible={parentModalVisible}
            />
          )}
        </div>
        <KanbanBoard
          createNewNode={this.createNewNode}
          deleteNode={this.deleteNode}
          handleAddParent={() => this.createNewParent('New Parent')}
          isTimerRunning={isTimerRunning}
          mustFocusNodeTitle={mustFocusNodeTitle}
          mustFocusParentTitle={mustFocusParentTitle}
          nodes={nodes}
          parentOrder={parentOrder}
          parents={parents}
          saveTime={this.updateNodeProperty}
          state={this.state}
          showModal={this.showModal}
          showParentModal={this.showParentModal}
          updateNodeTitle={this.updateNodeTitle}
          updateParentProperty={this.updateParentProperty}
          updateParents={this.updateParents}
        />
      </Layout>
    ) : (
      <div>Loading...</div>
    );
  }
}

export default withRouter(ProjectPage);

ProjectPage.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  match: PropTypes.any.isRequired,
};
