// Libs
import React, { Component } from 'react';
// Layouts
import { ipcRenderer } from 'electron';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { message } from 'antd';
import Layout from '../../layouts/App';
// Components
import NodeModal from '../../components/NodeModal/NodeModal';
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard';
import ParentController from '../../api/parent/ParentController';
import NodeController from '../../api/nodes/NodeController';
import IterationDisplay from '../../components/IterationDisplay/IterationDisplay';
import IterationController from '../../api/iterations/IterationController';

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
      iterations: {},
      selectedIteration: 0,
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

  createIteration = (title) => {
    IterationController.createIteration(title);

    const newState = {
      ...this.state,
      iterations: IterationController.getIterations(),
    };

    ipcRenderer.invoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  selectIteration = (iteration) => {
    IterationController.selectIteration(iteration);

    const newState = {
      ...this.state,
      selectedIteration: iteration,
    };

    ipcRenderer.invoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  updateNodeTitle = (newTitle, nodeId) => {
    this.updateNodeProperty(`title`, nodeId, newTitle);
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
  showModal = (node) => {
    const newState = {
      ...this.state,
      nodeModalVisible: true,
      modalNodeId: node.id,
    };
    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  deleteNode = (nodeId, parentId) => {
    const { isTimerRunning } = this.state;
    if (isTimerRunning) {
      message.error('Stop timer before deleting');
      return;
    }

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

  deleteParent = (parent) => {
    if (parent.nodeIds.length > 0) {
      message.error('Empty parent before deleting');
      return;
    }

    ParentController.deleteParent(parent.id);

    const newState = {
      ...this.state,
      parents: ParentController.getParents(),
      parentOrder: ParentController.getParentOrder(),
    };

    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });

    message.success('Deleted parent');
  };

  handleOk = () => {
    const { modalNodeId, nodes, timerPreferences } = this.state;

    ipcRenderer.send(
      'MSG_FROM_RENDERER',
      nodes[modalNodeId],
      this.projectName,
      this.state,
      timerPreferences,
    );
    const newState = {
      ...this.state,
      nodeModalVisible: false,
      currentNodeSelectedInTimer: modalNodeId,
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
      nodeModalVisible: false,
      modalNodeId: null,
    };

    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  updateNodeProperty = (propertyToUpdate, nodeId, newValue) => {
    NodeController.updateNodeProperty(propertyToUpdate, nodeId, newValue);

    const newState = {
      ...this.state,
      nodes: NodeController.getNodes(),
    };

    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  updateParentProperty = (propertyToUpdate, parentId, newValue) => {
    ParentController.updateParentProperty(propertyToUpdate, parentId, newValue);

    const newState = {
      ...this.state,
      parents: ParentController.getParents(),
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
      iterations,
      lokiLoaded,
      modalNodeId,
      mustFocusNodeTitle,
      mustFocusParentTitle,
      nodeModalVisible,
      nodes,
      parentOrder,
      parents,
      selectedIteration,
    } = this.state;

    return lokiLoaded ? (
      <Layout>
        <div>
          <span
            style={{
              fontWeight: `600`,
              fontSize: `xx-large`,
              marginLeft: `10px`,
            }}
          >
            {this.projectName}
          </span>
          <IterationDisplay createIteration={this.createIteration} iterations={iterations} selectedIteration={selectedIteration} selectIteration={this.selectIteration}/>
        </div>
        <div>
          {modalNodeId && (
            <NodeModal
              handleCancel={this.handleCancel}
              handleOk={this.handleOk}
              isTimerRunning={isTimerRunning}
              node={nodes[modalNodeId]}
              parents={parents}
              updateNodeProperty={this.updateNodeProperty}
              visible={nodeModalVisible}
            />
          )}
        </div>
        <KanbanBoard
          createNewNode={this.createNewNode}
          deleteNode={this.deleteNode}
          deleteParent={this.deleteParent}
          handleAddParent={() => this.createNewParent('New Parent')}
          isTimerRunning={isTimerRunning}
          mustFocusNodeTitle={mustFocusNodeTitle}
          mustFocusParentTitle={mustFocusParentTitle}
          nodes={nodes}
          parentOrder={parentOrder}
          parents={parents}
          saveTime={this.updateNodeProperty}
          selectedIteration={selectedIteration}
          state={this.state}
          showModal={this.showModal}
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
