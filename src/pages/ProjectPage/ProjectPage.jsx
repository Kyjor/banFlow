// Libs
import React, { Component } from 'react';
// Layouts
import { dialog, ipcRenderer } from 'electron';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { createSharedStore } from 'electron-shared-state';
import Layout from '../../layouts/App';
// Components
import NodeModal from '../../components/NodeModal/NodeModal';
import ParentModal from '../../components/ParentModal/ParentModal';
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard';

import {
  controllers,
  defaultTimerPreferences,
  initialIndividualProjectState,
  lokiService,
} from '../../stores/shared';

const sharedIndividualProjectState = createSharedStore(
  initialIndividualProjectState
);
const sharedControllers = createSharedStore(controllers);
const sharedTimerPrefs = createSharedStore(defaultTimerPreferences);
const sharedLokiService = createSharedStore(lokiService);

sharedIndividualProjectState.subscribe((state) => {
  // console.log(state);
});

sharedControllers.subscribe((state) => {
  // console.log(state);
});

sharedTimerPrefs.subscribe((state) => {
  // console.log(state);
});

sharedLokiService.subscribe((state) => {
  // console.log(state);
});

class ProjectPage extends Component {
  constructor(props) {
    super(props);

    this.projectName = this.props.match.params.name;
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
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  componentDidMount() {
    if (!this.state.lokiLoaded) {
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

    // todo: close timer window
  }

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
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  saveMetadataValue = (newValue, parentEnum) => {
    let newState = {};
    const newEnumObj = sharedControllers
      .getState()
      .metadataController.saveMetadataValue(newValue, parentEnum);
    switch (parentEnum) {
      case 'nodeType':
        newState = {
          ...this.state,
          nodeTypes: [...this.state.nodeTypes, newEnumObj.title],
        };
        break;
      case 'nodeState':
        newState = {
          ...this.state,
          nodeStates: [...this.state.nodeStates, newEnumObj.title],
        };
        break;
    }

    sharedIndividualProjectState.setState((state) => {
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
    const newTag = sharedControllers.getState().tagController.addTag(tag);
    const newTags = [...this.state.tags, newTag.title];
    sharedIndividualProjectState.setState((state) => {
      state.tags = newTags;
    });
  };

  updateNodeTitle = (newTitle, nodeId, isModalNode = true) => {
    this.updateNodeProperty(`title`, nodeId, newTitle, isModalNode);
    sharedIndividualProjectState.setState((state) => {
      state.mustFocusNodeTitle = true;
    });
  };

  showParentModal = (parent) => {
    sharedIndividualProjectState.setState((state) => {
      state.parentModalVisible = true;
      state.modalParent = parent;
    });
  };

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
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  deleteParent = (parentId) => {
    sharedControllers
      .getState()
      .parentController.deleteParent(this.state.modalParent.id);

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
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  handleOk = (e) => {
    sharedIndividualProjectState.setState((state) => {
      state.currentNodeSelectedInTimer = this.state.modalNode.id;
    });
    ipcRenderer.send(
      'MSG_FROM_RENDERER',
      this.state.modalNode,
      this.projectName,
      sharedIndividualProjectState.getState(),
      sharedTimerPrefs.getState()
    );
    // TODO: don't persist this
    sharedIndividualProjectState.setState((state) => {
      state.nodeModalVisible = false;
    });
  };

  handleCancel = (e) => {
    sharedIndividualProjectState.setState((state) => {
      state.parentModalVisible = false;
      state.nodeModalVisible = false;
      state.modalNode = null;
      state.modalParent = null;
    });
  };

  updateNodeProperty = (propertyToUpdate, nodeId, newValue, isFromModal) => {
    const newNode = sharedControllers
      .getState()
      .nodeController.updateNodeProperty(propertyToUpdate, nodeId, newValue);

    sharedIndividualProjectState.setState((state) => {
      state.nodes = sharedControllers.getState().nodeController.getNodes();
      state.modalNode = isFromModal ? newNode : null;
    });
  };

  updateParentProperty = (
    propertyToUpdate,
    parentId,
    newValue,
    isFromModal
  ) => {
    const newParent = sharedControllers
      .getState()
      .parentController.updateParentProperty(
        propertyToUpdate,
        parentId,
        newValue
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
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  render() {
    return this.state.lokiLoaded ? (
      <>
        <Layout>
          <div>{this.projectName}</div>
          <div>
            {this.state.modalNode && (
              <NodeModal
                addTagToNode={this.addTagToNode}
                node={this.state.modalNode}
                parents={this.state.parents}
                saveMetadataValue={this.saveMetadataValue}
                createGlobalTag={this.createGlobalTag}
                updateNodeEnum={this.updateNodeEnum}
                handleOk={this.handleOk}
                handleCancel={this.handleCancel}
                tags={this.state.tags}
                nodeTypes={this.state.nodeTypes}
                nodeStates={this.state.nodeStates}
                updateNodeProperty={this.updateNodeProperty}
                visible={this.state.nodeModalVisible}
              />
            )}
          </div>
          <div>
            {this.state.modalParent && (
              <ParentModal
                parent={this.state.modalParent}
                deleteParent={this.deleteParent}
                handleCancel={this.handleCancel}
                updateParentProperty={this.updateParentProperty}
                visible={this.state.parentModalVisible}
              />
            )}
          </div>
          <KanbanBoard
            createNewNode={this.createNewNode}
            deleteNode={this.deleteNode}
            handleAddParent={() => this.createNewParent('New Parent')}
            isTimerRunning={this.state.isTimerRunning}
            mustFocusNodeTitle={this.state.mustFocusNodeTitle}
            mustFocusParentTitle={this.state.mustFocusParentTitle}
            nodes={this.state.nodes}
            parentOrder={this.state.parentOrder}
            parents={this.state.parents}
            saveTime={this.updateNodeProperty}
            state={this.state}
            showModal={this.showModal}
            showParentModal={this.showParentModal}
            updateNodeTitle={this.updateNodeTitle}
            updateParentProperty={this.updateParentProperty}
            updateParents={this.updateParents}
          />
        </Layout>
      </>
    ) : (
      <div>Loading...</div>
    );
  }
}

export default withRouter(ProjectPage);

ProjectPage.propTypes = {
  match: PropTypes.any.isRequired,
};
