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

class ProjectPage extends Component {
  constructor(props) {
    super(props);

    const { match } = this.props;

    this.projectName = match.params.name;
    // if projectname contains @ symbols, replace them with slashes
    this.projectName = this.projectName.replace(/[@]/g, '/');

    this.state = {
      currentProjectName: this.projectName,
      isTimerRunning: false,
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
    ipcRenderer.removeAllListeners('UpdateProjectPageState');
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
      ...newState,
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
      ...newState,
    });
  };

  updateNodeTitle = (newTitle, nodeId, isModalNode = true) => {
    this.updateNodeProperty(`title`, nodeId, newTitle, isModalNode);
    const newState = {
      ...this.state,
      nodes: NodeController.getNodes(),
      mustFocusNodeTitle: false,
    };
    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  showParentModal = () => {
    const newState = {
      ...this.state,
      parentModalVisible: true,
    };
    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  showModal = (node) => {
    const newState = {
      ...this.state,
      nodeModalVisible: true,
      modalNode: node,
    };
    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
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
      ...newState,
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
      ...newState,
    });
  };

  handleOk = () => {
    const { modalNode, timerPreferences } = this.state;

    ipcRenderer.send(
      'MSG_FROM_RENDERER',
      modalNode,
      this.projectName,
      this.state,
      timerPreferences,
    );
    const newState = {
      ...this.state,
      nodeModalVisible: false,
      currentNodeSelectedInTimer: modalNode.id,
    };
    // TODO: don't persist this
    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  handleCancel = () => {
    const newState = {
      ...this.state,
      parentModalVisible: false,
      nodeModalVisible: false,
      modalNode: null,
      modalParent: null,
    };

    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  updateNodeProperty = (propertyToUpdate, nodeId, newValue, isFromModal) => {
    const newNode = NodeController.updateNodeProperty(
      propertyToUpdate,
      nodeId,
      newValue,
    );

    const newState = {
      ...this.state,
      nodes: NodeController.getNodes(),
      modalNode: isFromModal ? newNode : null,
    };

    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
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

    const newState = {
      ...this.state,
      parents: ParentController.getParents(),
      modalParent: isFromModal ? newParent : null,
    };

    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
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
      ...newState,
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
      parentModalVisible,
      parentOrder,
      parents,
    } = this.state;

    return lokiLoaded ? (
      <Layout>
        <div>{this.projectName}</div>
        <div>
          {modalNode && (
            <NodeModal
              handleCancel={this.handleCancel}
              handleOk={this.handleOk}
              node={modalNode}
              parents={parents}
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
