// Libs
import React, { Component } from 'react';
// Layouts
import { ipcRenderer } from 'electron';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import Layout from '../../layouts/App';
// Components
import NodeModal from '../../components/NodeModal/NodeModal';
import ParentModal from '../../components/ParentModal/ParentModal';
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard';
import ParentController from '../../api/parent/ParentController';
import NodeController from '../../api/nodes/NodeController';
import MetadataController from '../../api/metadata/MetadataController';
import TagController from '../../api/tag/TagController';

class ProjectPage extends Component {
  constructor(props) {
    super(props);

    const { match } = this.props;

    this.projectName = match.params.name;
    // if projectname contains @ symbols, replace them with slashes
    this.projectName = this.projectName.replace(/[@]/g, '/');

    this.state = {
      currentProjectName: this.projectName,
    };
  }

  componentDidMount() {
    ipcRenderer.invoke('api:initializeProjectState', this.projectName);

    const self = this;
    ipcRenderer.on('UpdateProjectPageState', function (e, newState) {
      self.setState(newState);
    });
  }

  componentWillUnmount() {
    // todo: loki loaded set to false
    console.log('unmounting');
    // todo: close timer window
  }

  createNewParent = (parentTitle) => {
    ParentController.createParent(parentTitle);

    const newState = {
      ...this.state,
      parents: ParentController.getParents(),
      parentOrder: ParentController.getParentOrder(),
      mustFocusParentTitle: true,
    };
    ipcRenderer.invoke('api:setProjectState', {
      newState,
    });
  };

  createNewNode = (parentId) => {
    const newTitle = `New Node`;
    NodeController.createNode('child', newTitle, parentId);

    const newState = {
      ...this.state,
      nodes: NodeController.getNodes(),
      parents: ParentController.getParents(),
      mustFocusNodeTitle: true,
    };
    ipcRenderer.invoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      newState,
    });
  };

  saveMetadataValue = (newValue, parentEnum) => {
    const { nodeTypes, nodeStates } = this.state;

    let newState = {};
    const newEnumObj = MetadataController.saveMetadataValue(
      newValue,
      parentEnum,
    );
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

    ipcRenderer.invoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      newState,
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
    const newTag = TagController.addTag(tag);
    const newTags = [...tags, newTag.title];
    ipcRenderer.invoke('api:setProjectState', {
      tags: newTags,
    });
  };

  updateNodeTitle = (newTitle, nodeId, isModalNode = true) => {
    this.updateNodeProperty(`title`, nodeId, newTitle, isModalNode);
    ipcRenderer.invoke('api:setProjectState', {
      mustFocusNodeTitle: false,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  showParentModal = (parent) => {
    ipcRenderer.invoke('api:setProjectState', {
      parentModalVisible: true,
      modalParent: parent,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  showModal = (node) => {
    ipcRenderer.invoke('api:setProjectState', {
      nodeModalVisible: true,
      modalNode: node,
    });
  };

  deleteNode = (nodeId, parentId) => {
    NodeController.deleteNode(nodeId, parentId);

    const newState = {
      ...this.state,
      nodes: NodeController.getNodes(),
      parents: ParentController.getParents(),
    };

    ipcRenderer.invoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      newState,
    });
  };

  deleteParent = () => {
    const { modalParent } = this.state;

    ParentController.deleteParent(modalParent.id);

    const newState = {
      ...this.state,
      parents: ParentController.getParents(),
      parentOrder: ParentController.getParentOrder(),
      parentModalVisible: false,
      modalParent: null,
    };

    ipcRenderer.invoke('api:setProjectState', {
      newState,
    });
  };

  handleOk = () => {
    const { modalNode, timerPreferences } = this.state;

    ipcRenderer.invoke('api:setProjectState', {
      currentNodeSelectedInTimer: modalNode.id,
    });
    ipcRenderer.send(
      'MSG_FROM_RENDERER',
      modalNode,
      this.projectName,
      this.state,
      timerPreferences,
    );
    // TODO: don't persist this
    ipcRenderer.invoke('api:setProjectState', {
      nodeModalVisible: false,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  handleCancel = () => {
    ipcRenderer.invoke('api:setProjectState', {
      parentModalVisible: false,
      nodeModalVisible: false,
      modalNode: null,
      modalParent: null,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  updateNodeProperty = (propertyToUpdate, nodeId, newValue, isFromModal) => {
    const newNode = NodeController.updateNodeProperty(
      propertyToUpdate,
      nodeId,
      newValue,
    );

    ipcRenderer.invoke('api:setProjectState', {
      nodes: NodeController.getNodes(),
      modalNode: isFromModal ? newNode : null,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  updateParentProperty = (
    propertyToUpdate,
    parentId,
    newValue,
    isFromModal,
  ) => {
    const newParent = ParentController.updateParentProperty(
      propertyToUpdate,
      parentId,
      newValue,
    );

    ipcRenderer.invoke('api:setProjectState', {
      parents: ParentController.getParents(),
      modalParent: isFromModal ? newParent : null,
    });
  };

  updateParents = (controllerFunction) => {
    controllerFunction();
    const currentState = this.state;

    const newState = {
      ...currentState,
      parents: ParentController.getParents(),
      parentOrder: ParentController.getParentOrder(),
    };

    ipcRenderer.invoke('api:setProjectState', {
      newState,
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
