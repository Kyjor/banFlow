// Libs
import React, { Component } from 'react';
// Layouts
import { ipcRenderer } from 'electron';
import PropTypes from 'prop-types';
import { Button, message } from 'antd';
import Layout from '../../layouts/App';
// Components
import NodeModal from '../../components/NodeModal/NodeModal';
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard';
import ParentController from '../../api/parent/ParentController';
import NodeController from '../../api/nodes/NodeController';
import IterationDisplay from '../../components/IterationDisplay/IterationDisplay';
import IterationController from '../../api/iterations/IterationController';
import IterationModal from '../../components/IterationModal/IterationModal';

class ProjectPage extends Component {
  constructor(props) {
    super(props);

    const location = window.location.href; // Get the current URL
    this.projectName = location.split('/').pop();
    // if projectname contains @ symbols, replace them with slashes
    this.projectName = this.projectName.replace(/[@]/g, '/');
    localStorage.setItem('currentProject', this.projectName);
    this.trelloToken = localStorage.getItem('trelloToken');
    this.trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
    localStorage.setItem(`trelloKey`, this.trelloKey);

    this.state = {
      currentProjectName: this.projectName,
      currentEditIteration: null,
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

  createNewNode = async (parentId) => {
    const { selectedIteration } = this.state;
    const newTitle = `New Node`;
    console.log(
      `Creating new node with title: ${newTitle}, in parent: ${parentId}, in iteration: ${selectedIteration}`,
    );
    const node = await NodeController.createNode(
      'child',
      newTitle,
      parentId,
      selectedIteration,
    );

    console.log(node);

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

  editIteration = (iteration) => {
    // open modal to edit iteration
    const newState = {
      ...this.state,
      currentEditIteration: iteration,
    };

    ipcRenderer.invoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  deleteIteration = (iterationId) => {
    if (iterationId === 0) {
      message.error('Cannot delete backlog');
      return;
    }

    // If any nodes are in the iteration, don't delete
    const { nodes } = this.state;
    let anyNodesInIteration = false;
    Object.values(nodes).forEach((node) => {
      if (node.iterationId !== 0 && node.iterationId === iterationId) {
        anyNodesInIteration = true;
      }
    });

    if (anyNodesInIteration) {
      message.error('Empty iteration before deleting');
      return;
    }

    IterationController.deleteIteration(iterationId);

    const newState = {
      ...this.state,
      iterations: IterationController.getIterations(),
      selectedIteration: 0,
    };

    ipcRenderer.invoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  handleIterationCancel = () => {
    const newState = {
      ...this.state,
      currentEditIteration: null,
    };

    ipcRenderer.invoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  setSelectedIteration = (iteration) => {
    // TODO: IterationController.selectIteration(iteration); // Save selected iteration to db
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
    const trelloAuth = {
      key: this.trelloKey,
      token: this.trelloToken,
    };

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

  syncTrelloCard = (node, event) => {
    console.log('syncing trello card');
    fetch(
      `https://api.trello.com/1/cards/${node.trello.id}?key=${this.trelloKey}&token=${this.trelloToken}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    )
      .then((response) => {
        console.log(`Response: ${response.status} ${response.statusText}`);
        return response.text();
      })
      .then((text) => {
        const card = JSON.parse(text);
        const local = new Date(node.lastUpdated);
        const remote = new Date(card.dateLastActivity);

        console.log(node);
        console.log(node.lastUpdated);
        console.log(local);
        console.log(remote);

        if (local > remote) {
          console.log('need to update remote');
        } else if (
          !node.lastUpdated ||
          remote.getTime() - local.getTime() >= 10000
        ) {
          console.log('need to update local');
          console.log(card);
          NodeController.updateNodeProperty('trello', node.id, card, false);
          NodeController.updateNodeProperty('title', node.id, card.name, false);
          NodeController.updateNodeProperty(
            'description',
            node.id,
            card.desc,
            false,
          );

          const newState = {
            ...this.state,
            nodeModalVisible: false,
            nodes: NodeController.getNodes(),
          };
          ipcRenderer.invoke('api:setProjectState', {
            ...newState,
          });
        } else {
          console.log('nothing to sync here...');
        }
      })
      .catch((err) => console.error(err));
  };

  // eslint-disable-next-line class-methods-use-this
  updateNodeProperty = (
    propertyToUpdate,
    nodeId,
    newValue,
    shouldSync = true,
  ) => {
    NodeController.updateNodeProperty(
      propertyToUpdate,
      nodeId,
      newValue,
      shouldSync,
    );

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

  syncProject = (trello) => {
    const { parents } = this.state;

    fetch(
      `https://api.trello.com/1/boards/${trello.id}/lists?key=${this.trelloKey}&token=${this.trelloToken}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    )
      .then((response) => {
        console.log(`Response: ${response.status} ${response.statusText}`);
        return response.text();
      })
      .then((text) => {
        console.log(JSON.parse(text));
        const lists = JSON.parse(text);
        lists.forEach((list) => {
          // check if parent exists
          const parentExists = Object.values(parents).find(
            (parent) => parent?.trello?.id === list.id,
          );
          if (!parentExists) {
            ParentController.createParent(list.name, list);
          } else {
            console.log('Parent already exists');
          }
        });
      })
      .then(() => {
        // refresh page
        // window.location.reload();
        fetch(
          `https://api.trello.com/1/boards/${trello.id}/cards?key=${this.trelloKey}&token=${this.trelloToken}`,
          {
            method: 'GET',
          },
        )
          .then((response) => {
            console.log(`Response: ${response.status} ${response.statusText}`);
            return response.text();
          })
          .then((text) => {
            console.log(JSON.parse(text));
            const cards = JSON.parse(text);
            cards.forEach((card) => {
              // check if node exists
              const nodeExists = Object.values(this.state.nodes).find(
                (node) => node?.trello?.id === card.id,
              );
              const nodeParent = Object.values(
                ParentController.getParents(),
              ).find((parent) => parent?.trello?.id === card.idList);

              const nodeParentId = nodeParent.id;
              if (!nodeExists) {
                NodeController.createNode(
                  'child',
                  card.name,
                  nodeParentId,
                  0,
                  card,
                );
              } else {
                console.log('Node already exists');
              }
            });
          })
          .then(() => {
            window.location.reload();
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));
  };

  render() {
    const {
      currentEditIteration,
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
      projectSettings,
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
          {projectSettings?.trello?.name && (
            <Button onClick={() => this.syncProject(projectSettings.trello)}>
              Sync: {projectSettings.trello.name}
            </Button>
          )}
          <br />
          <IterationDisplay
            createIteration={this.createIteration}
            editIteration={this.editIteration}
            iterations={iterations}
            selectedIteration={selectedIteration}
            setSelectedIteration={this.setSelectedIteration}
          />
          {currentEditIteration && (
            <IterationModal
              deleteIteration={this.deleteIteration}
              iteration={iterations[currentEditIteration]}
              handleCancel={this.handleIterationCancel}
            />
          )}
        </div>
        <div>
          {modalNodeId && (
            <NodeModal
              handleCancel={this.handleCancel}
              handleOk={this.handleOk}
              isTimerRunning={isTimerRunning}
              iterations={iterations}
              node={nodes[modalNodeId]}
              parents={parents}
              syncTrelloCard={this.syncTrelloCard}
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

export default ProjectPage;

ProjectPage.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  match: PropTypes.any.isRequired,
};
