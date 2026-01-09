// Libs
import React, { Component } from 'react';
// Layouts
import { ipcRenderer } from 'electron';
import PropTypes from 'prop-types';
import {
  Button,
  Card,
  Collapse,
  DatePicker,
  Input,
  InputNumber,
  message,
  Radio,
  Select,
  Space,
  Badge,
} from 'antd';
import {
  FilterOutlined,
  SearchOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';
import Layout from '../../layouts/App';
// Components
import NodeModal from '../../components/NodeModal/NodeModal';
import KanbanBoard from '../../components/KanbanBoard/KanbanBoard';
import ParentController from '../../api/parent/ParentController';
import NodeController from '../../api/nodes/NodeController';
import IterationDisplay from '../../components/IterationDisplay/IterationDisplay';
import IterationController from '../../api/iterations/IterationController';
import IterationModal from '../../components/IterationModal/IterationModal';
import ParentModal from '../../components/ParentModal/ParentModal';
import parentController from '../../api/parent/ParentController';

const { RangePicker } = DatePicker;

class ProjectPage extends Component {
  constructor(props) {
    super(props);

    const location = window.location.href; // Get the current URL
    this.projectName = location.split('/').pop();
    // Remove query parameters (everything after ?)
    this.projectName = this.projectName.split('?')[0];
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
      parentModalVisible: false,
      modalParentId: null,
      filtersOpen: false,
      searchText: '',
      filterRules: [],
      queryConjunction: 'AND',
    };
  }

  componentDidMount() {
    const newState = ipcRenderer.sendSync(
      'api:initializeProjectState',
      this.projectName,
    );

    this.setState(
      {
        ...this.state,
        ...newState,
      },
      () => {
        // Check URL parameters for node or parent to open
        this.checkUrlParameters();
      },
    );

    const self = this;
    ipcRenderer.on('UpdateProjectPageState', function (e, newState) {
      self.setState(newState);
    });
  }

  componentDidUpdate(prevProps, prevState) {
    // Check URL parameters when state updates (e.g., after nodes/parents are loaded)
    if (!prevState.lokiLoaded && this.state.lokiLoaded) {
      this.checkUrlParameters();
    }
  }

  checkUrlParameters = () => {
    // Parse hash URL for HashRouter: #/projectPage/ProjectName?node=nodeId
    const { hash } = window.location;
    const hashParts = hash.split('?');
    if (hashParts.length < 2) return;

    const queryString = hashParts[1];
    const urlParams = new URLSearchParams(queryString);
    const nodeId = urlParams.get('node');
    const parentId = urlParams.get('parent');

    if (nodeId && this.state.nodes && this.state.nodes[nodeId]) {
      const node = this.state.nodes[nodeId];
      // Small delay to ensure modal can render
      setTimeout(() => {
        this.showModal(node);
        // Clean up URL parameter
        const newHash = hashParts[0];
        window.history.replaceState({}, '', window.location.pathname + newHash);
      }, 100);
    } else if (parentId && this.state.parents && this.state.parents[parentId]) {
      const parent = this.state.parents[parentId];
      // Small delay to ensure modal can render
      setTimeout(() => {
        this.showParentModal(parent);
        // Clean up URL parameter
        const newHash = hashParts[0];
        window.history.replaceState({}, '', window.location.pathname + newHash);
      }, 100);
    }
  };

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

  // eslint-disable-next-line class-methods-use-this
  showParentModal = (parent) => {
    const newState = {
      ...this.state,
      parentModalVisible: true,
      modalParentId: parent.id,
    };
    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  handleParentModalCancel = () => {
    const newState = {
      ...this.state,
      parentModalVisible: false,
      modalParentId: null,
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
      modalNodeId: null,
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
          NodeController.updateNodeProperty('title', node.id, node.title);
        } else if (
          !node.lastUpdated ||
          remote.getTime() - local.getTime() >= 10000
        ) {
          console.log('need to update local');
          console.log(card);
          NodeController.updateNodeProperty('trello', node.id, card, false);
          if (card.name !== node.title) {
            NodeController.updateNodeProperty(
              'title',
              node.id,
              card.name,
              false,
            );
          }

          // Parse description and BanFlow fields
          const { cleanDescription, banflowFields } =
            this.parseBanflowDescription(card.desc);
          if (cleanDescription !== node.description) {
            NodeController.updateNodeProperty(
              'description',
              node.id,
              cleanDescription,
              false,
            );
          }

          // Update BanFlow fields if they exist
          if (banflowFields.timeSpent !== undefined) {
            NodeController.updateNodeProperty(
              'timeSpent',
              node.id,
              banflowFields.timeSpent,
              false,
            );
          }

          const currentParent = ParentController.getParents()[node.parent];
          const newParentId = card.idList;
          if (currentParent.trello && currentParent.trello.id !== newParentId) {
            console.log('need to update parent');
            // get parent where parent.trello.id === newParentId
            const newParent = Object.values(ParentController.getParents()).find(
              (parent) => parent.trello.id === newParentId,
            );

            const startNodeIds = Array.from(currentParent.nodeIds);
            // remove node from current parent
            startNodeIds.splice(startNodeIds.indexOf(node.id), 1);
            const newStart = {
              ...currentParent,
              nodeIds: startNodeIds,
            };

            const finishNodeIds = Array.from(newParent.nodeIds);
            // add node to new parent
            finishNodeIds.push(node.id);
            const newFinish = {
              ...newParent,
              nodeIds: finishNodeIds,
            };
            parentController.updateNodesInParents(newStart, newFinish, node.id);
          }

          const newState = {
            ...this.state,
            nodeModalVisible: false,
            nodes: NodeController.getNodes(),
            parents: ParentController.getParents(),
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
      nodes: NodeController.getNodes(), // Also refresh nodes to reflect any property changes (e.g., completion status)
    };

    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  toggleFilters = () => {
    this.setState((prev) => ({ filtersOpen: !prev.filtersOpen }));
  };

  setSearchText = (value) => {
    this.setState({ searchText: value || '' });
  };

  setQueryConjunction = (value) => {
    this.setState({ queryConjunction: value });
  };

  addFilterRule = () => {
    const { filterRules } = this.state;
    const newRule = {
      id: Date.now(),
      field: 'titleDescription',
      value: '',
    };
    this.setState({ filterRules: [...filterRules, newRule] });
  };

  updateFilterRule = (id, updates) => {
    const { filterRules } = this.state;
    const next = filterRules.map((rule) =>
      rule.id === id ? { ...rule, ...updates } : rule,
    );
    this.setState({ filterRules: next });
  };

  removeFilterRule = (id) => {
    const { filterRules } = this.state;
    this.setState({ filterRules: filterRules.filter((r) => r.id !== id) });
  };

  evaluateRule = (node, rule) => {
    if (!rule || !rule.field) return true;
    const { value } = rule;
    const lc = (text) => (text || '').toString().toLowerCase();

    switch (rule.field) {
      case 'titleDescription':
        return (
          lc(node.title).includes(lc(value)) ||
          lc(node.description).includes(lc(value))
        );
      case 'status':
        return value ? node.nodeState === value : true;
      case 'parent':
        return value ? node.parent === value : true;
      case 'tags':
        if (!value || value.length === 0) return true;
        return (
          Array.isArray(node.tags) && node.tags.some((t) => value.includes(t))
        );
      case 'labels':
        if (!value || value.length === 0) return true;
        return (
          Array.isArray(node.labels) &&
          node.labels.some((l) => value.includes(l))
        );
      case 'dueDate': {
        if (!value || value.length === 0) return true;
        const [start, end] = value;
        const due = node.dueDate ? new Date(node.dueDate) : null;
        if (!due) return false;
        if (start && due < new Date(start)) return false;
        if (end && due > new Date(end)) return false;
        return true;
      }
      case 'created': {
        if (!value || value.length === 0) return true;
        const [start, end] = value;
        const created = node.created ? new Date(node.created) : null;
        if (!created) return false;
        if (start && created < new Date(start)) return false;
        if (end && created > new Date(end)) return false;
        return true;
      }
      case 'updated': {
        if (!value || value.length === 0) return true;
        const [start, end] = value;
        const updated = node.lastUpdated ? new Date(node.lastUpdated) : null;
        if (!updated) return false;
        if (start && updated < new Date(start)) return false;
        if (end && updated > new Date(end)) return false;
        return true;
      }
      case 'estimatedTime': {
        if (!value) return true;
        const min = value.min ?? null;
        const max = value.max ?? null;
        const num = node.estimatedTime ?? 0;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
      }
      case 'timeSpent': {
        if (!value) return true;
        const min = value.min ?? null;
        const max = value.max ?? null;
        const num = node.timeSpent ?? 0;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
      }
      case 'completion': {
        if (value === undefined || value === null || value === '') return true;
        const boolVal = value === 'complete';
        return !!node.isComplete === boolVal;
      }
      case 'iteration': {
        if (!value && value !== 0) return true;
        return node.iterationId === value;
      }
      default:
        return true;
    }
  };

  filterNode = (node) => {
    const { searchText, filterRules, queryConjunction } = this.state;
    const lc = (text) => (text || '').toString().toLowerCase();

    // Basic search on title + description
    if (searchText) {
      const matchesSearch =
        lc(node.title).includes(lc(searchText)) ||
        lc(node.description).includes(lc(searchText));
      if (!matchesSearch) return false;
    }

    if (!filterRules || filterRules.length === 0) return true;

    if (queryConjunction === 'OR') {
      return filterRules.some((rule) => this.evaluateRule(node, rule));
    }

    // default AND
    return filterRules.every((rule) => this.evaluateRule(node, rule));
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
                console.log('node doesnt exist');
                NodeController.createNode(
                  'child',
                  card.name,
                  nodeParentId,
                  0,
                  card,
                );
              } else {
                console.log('Node already exists');
                // Check if node needs to be moved to a different parent/column
                const currentParent =
                  ParentController.getParents()[nodeExists.parent];
                const newParentId = card.idList;

                if (
                  currentParent.trello &&
                  currentParent.trello.id !== newParentId
                ) {
                  console.log('Node needs to be moved to different column');
                  const newParent = Object.values(
                    ParentController.getParents(),
                  ).find((parent) => parent.trello.id === newParentId);

                  const startNodeIds = Array.from(currentParent.nodeIds);
                  // remove node from current parent
                  startNodeIds.splice(startNodeIds.indexOf(nodeExists.id), 1);
                  const newStart = {
                    ...currentParent,
                    nodeIds: startNodeIds,
                  };

                  const finishNodeIds = Array.from(newParent.nodeIds);
                  // add node to new parent
                  finishNodeIds.push(nodeExists.id);
                  const newFinish = {
                    ...newParent,
                    nodeIds: finishNodeIds,
                  };
                  parentController.updateNodesInParents(
                    newStart,
                    newFinish,
                    nodeExists.id,
                  );
                }

                // Also update node properties if they've changed
                if (card.name !== nodeExists.title) {
                  NodeController.updateNodeProperty(
                    'title',
                    nodeExists.id,
                    card.name,
                    false,
                  );
                }

                // Parse description and BanFlow fields
                const { cleanDescription, banflowFields } =
                  this.parseBanflowDescription(card.desc);
                if (cleanDescription !== nodeExists.description) {
                  NodeController.updateNodeProperty(
                    'description',
                    nodeExists.id,
                    cleanDescription,
                    false,
                  );
                }

                // Update BanFlow fields if they exist
                if (banflowFields.timeSpent !== undefined) {
                  NodeController.updateNodeProperty(
                    'timeSpent',
                    nodeExists.id,
                    banflowFields.timeSpent,
                    false,
                  );
                }

                // Update trello data
                NodeController.updateNodeProperty(
                  'trello',
                  nodeExists.id,
                  card,
                  false,
                );
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

  // Parse Trello description to separate clean description from BanFlow fields
  parseBanflowDescription = (description) => {
    if (!description) {
      return { cleanDescription: '', banflowFields: {} };
    }

    const banflowSeparator =
      '---Banflow fields, do not edit this line or below it---';
    const parts = description.split(banflowSeparator);

    const cleanDescription = parts[0].trim();
    const banflowFields = {};

    if (parts.length > 1) {
      const fieldsSection = parts[1].trim();
      const fieldLines = fieldsSection.split('\n');

      fieldLines.forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('banflow:')) {
          const fieldPart = trimmedLine.substring(8); // Remove 'banflow:' prefix
          const [key, value] = fieldPart.split('=');
          if (key && value !== undefined) {
            // Convert numeric values
            if (key === 'timeSpent' && !isNaN(value)) {
              banflowFields[key] = parseInt(value, 10);
            } else {
              banflowFields[key] = value;
            }
          }
        }
      });
    }

    return { cleanDescription, banflowFields };
  };

  render() {
    const {
      currentEditIteration,
      isTimerRunning,
      iterations,
      lokiLoaded,
      modalNodeId,
      modalParentId,
      mustFocusNodeTitle,
      mustFocusParentTitle,
      nodeModalVisible,
      parentModalVisible,
      nodes,
      parentOrder,
      parents,
      projectSettings,
      selectedIteration,
      filtersOpen,
      searchText,
      filterRules,
      queryConjunction,
    } = this.state;

    return lokiLoaded ? (
      <Layout>
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
          {modalParentId && (
            <ParentModal
              handleCancel={this.handleParentModalCancel}
              deleteParent={this.deleteParent}
              parent={parents[modalParentId]}
              updateParentProperty={this.updateParentProperty}
              visible={parentModalVisible}
            />
          )}
          {currentEditIteration && (
            <IterationModal
              deleteIteration={this.deleteIteration}
              iteration={iterations[currentEditIteration]}
              handleCancel={this.handleIterationCancel}
            />
          )}
        </div>
        <Card
          style={{
            margin: '16px 16px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e8e8e8',
          }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flex: '1',
                minWidth: '200px',
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '20px',
                  color: '#262626',
                }}
              >
                {this.projectName}
              </span>
              {projectSettings?.trello?.name && (
                <Button
                  size="small"
                  onClick={() => this.syncProject(projectSettings.trello)}
                  style={{ fontSize: '12px' }}
                >
                  Sync: {projectSettings.trello.name}
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}
              >
                Iteration:
              </span>
              <Select
                onSelect={(newValue) => {
                  this.setSelectedIteration(newValue);
                }}
                showSearch
                style={{ width: 200 }}
                placeholder="Add an iteration by typing..."
                onInputKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    const newItem = e.target.value;
                    const nextId = Object.keys(iterations || {}).length + 1;
                    this.setSelectedIteration(nextId);
                    this.createIteration(newItem);
                  }
                }}
                value={selectedIteration}
                size="small"
              >
                <Select.Option key={0} value={0}>
                  Backlog
                </Select.Option>
                {iterations &&
                  Object.values(iterations).map((item) => (
                    <Select.Option key={item.id} value={item.id}>
                      {item.title}
                    </Select.Option>
                  ))}
              </Select>
              {selectedIteration !== 0 && (
                <Button
                  size="small"
                  onClick={() => this.editIteration(selectedIteration)}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <Input.Search
              allowClear
              placeholder="Search title + description"
              value={searchText}
              onChange={(e) => this.setSearchText(e.target.value)}
              style={{ flex: '1', minWidth: '200px', maxWidth: '400px' }}
              prefix={<SearchOutlined />}
            />
            <Badge count={filterRules.length} showZero={false} offset={[8, 0]}>
              <Button
                icon={filtersOpen ? <UpOutlined /> : <DownOutlined />}
                onClick={this.toggleFilters}
                type={filtersOpen ? 'default' : 'text'}
              >
                <FilterOutlined /> Filters
              </Button>
            </Badge>
          </div>
          {filtersOpen && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #f0f0f0',
              }}
            >
              <div
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}
                >
                  Match:
                </span>
                <Radio.Group
                  value={queryConjunction}
                  onChange={(e) => this.setQueryConjunction(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="small"
                >
                  <Radio.Button value="AND">All rules (AND)</Radio.Button>
                  <Radio.Button value="OR">Any rule (OR)</Radio.Button>
                </Radio.Group>
              </div>
              <div style={{ marginBottom: '8px' }}>
                {filterRules.map((rule) => {
                  const { field } = rule;
                  const commonProps = {
                    style: { width: '100%' },
                    size: 'small',
                  };

                  const renderValueInput = () => {
                    if (field === 'status') {
                      const statuses = Array.from(
                        new Set(
                          Object.values(nodes)
                            .map((n) => n?.nodeState)
                            .filter(Boolean),
                        ),
                      );
                      return (
                        <Select
                          {...commonProps}
                          placeholder="Select status"
                          value={rule.value}
                          onChange={(val) =>
                            this.updateFilterRule(rule.id, { value: val })
                          }
                          allowClear
                        >
                          {statuses.map((s) => (
                            <Select.Option key={s} value={s}>
                              {s}
                            </Select.Option>
                          ))}
                        </Select>
                      );
                    }
                    if (field === 'parent') {
                      return (
                        <Select
                          {...commonProps}
                          placeholder="Select parent"
                          value={rule.value}
                          onChange={(val) =>
                            this.updateFilterRule(rule.id, { value: val })
                          }
                          allowClear
                          showSearch
                          optionFilterProp="children"
                        >
                          {parentOrder.map((pid) => (
                            <Select.Option key={pid} value={pid}>
                              {parents[pid]?.title || pid}
                            </Select.Option>
                          ))}
                        </Select>
                      );
                    }
                    if (field === 'tags') {
                      const tags = Array.from(
                        new Set(
                          Object.values(nodes)
                            .flatMap((n) =>
                              Array.isArray(n?.tags) ? n.tags : [],
                            )
                            .filter(Boolean),
                        ),
                      );
                      return (
                        <Select
                          {...commonProps}
                          mode="multiple"
                          placeholder="Select tags"
                          value={rule.value}
                          onChange={(val) =>
                            this.updateFilterRule(rule.id, { value: val })
                          }
                          allowClear
                        >
                          {tags.map((t) => (
                            <Select.Option key={t} value={t}>
                              {t}
                            </Select.Option>
                          ))}
                        </Select>
                      );
                    }
                    if (field === 'labels') {
                      const labels = Array.from(
                        new Set(
                          Object.values(nodes)
                            .flatMap((n) =>
                              Array.isArray(n?.labels) ? n.labels : [],
                            )
                            .filter(Boolean),
                        ),
                      );
                      return (
                        <Select
                          {...commonProps}
                          mode="multiple"
                          placeholder="Select labels"
                          value={rule.value}
                          onChange={(val) =>
                            this.updateFilterRule(rule.id, { value: val })
                          }
                          allowClear
                        >
                          {labels.map((l) => (
                            <Select.Option key={l} value={l}>
                              {l}
                            </Select.Option>
                          ))}
                        </Select>
                      );
                    }
                    if (
                      field === 'dueDate' ||
                      field === 'created' ||
                      field === 'updated'
                    ) {
                      return (
                        <RangePicker
                          {...commonProps}
                          onChange={(dates) =>
                            this.updateFilterRule(rule.id, {
                              value: dates
                                ? dates.map((d) => (d ? d.toISOString() : null))
                                : [],
                            })
                          }
                        />
                      );
                    }
                    if (field === 'estimatedTime' || field === 'timeSpent') {
                      return (
                        <Space size={4} style={{ width: '100%' }}>
                          <InputNumber
                            {...commonProps}
                            placeholder="Min (seconds)"
                            value={rule.value?.min}
                            onChange={(val) =>
                              this.updateFilterRule(rule.id, {
                                value: { ...(rule.value || {}), min: val },
                              })
                            }
                          />
                          <InputNumber
                            {...commonProps}
                            placeholder="Max (seconds)"
                            value={rule.value?.max}
                            onChange={(val) =>
                              this.updateFilterRule(rule.id, {
                                value: { ...(rule.value || {}), max: val },
                              })
                            }
                          />
                        </Space>
                      );
                    }
                    if (field === 'completion') {
                      return (
                        <Select
                          {...commonProps}
                          placeholder="Completion"
                          value={rule.value}
                          onChange={(val) =>
                            this.updateFilterRule(rule.id, { value: val })
                          }
                          allowClear
                        >
                          <Select.Option value="complete">
                            Complete
                          </Select.Option>
                          <Select.Option value="incomplete">
                            Incomplete
                          </Select.Option>
                        </Select>
                      );
                    }
                    if (field === 'iteration') {
                      const iterationOptions = Object.values(
                        iterations || {},
                      ).map((iter) => ({
                        id: iter.id,
                        name: iter.title || `Iteration ${iter.id}`,
                      }));
                      return (
                        <Select
                          {...commonProps}
                          placeholder="Select iteration"
                          value={rule.value}
                          onChange={(val) =>
                            this.updateFilterRule(rule.id, { value: val })
                          }
                          allowClear
                        >
                          <Select.Option value={0}>Backlog</Select.Option>
                          {iterationOptions.map((it) => (
                            <Select.Option key={it.id} value={it.id}>
                              {it.name}
                            </Select.Option>
                          ))}
                        </Select>
                      );
                    }
                    return (
                      <Input
                        {...commonProps}
                        placeholder="Contains text"
                        value={rule.value}
                        onChange={(e) =>
                          this.updateFilterRule(rule.id, {
                            value: e.target.value,
                          })
                        }
                      />
                    );
                  };

                  return (
                    <div
                      key={rule.id}
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '8px',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Select
                        style={{ width: '180px' }}
                        size="small"
                        value={rule.field}
                        onChange={(val) =>
                          this.updateFilterRule(rule.id, {
                            field: val,
                            value: undefined,
                          })
                        }
                      >
                        <Select.Option value="titleDescription">
                          Title / Description
                        </Select.Option>
                        <Select.Option value="status">
                          Status / State
                        </Select.Option>
                        <Select.Option value="parent">Parent</Select.Option>
                        <Select.Option value="tags">Tags</Select.Option>
                        <Select.Option value="labels">Labels</Select.Option>
                        <Select.Option value="dueDate">Due Date</Select.Option>
                        <Select.Option value="created">
                          Created Date
                        </Select.Option>
                        <Select.Option value="updated">
                          Updated Date
                        </Select.Option>
                        <Select.Option value="estimatedTime">
                          Estimated Time (sec)
                        </Select.Option>
                        <Select.Option value="timeSpent">
                          Time Spent (sec)
                        </Select.Option>
                        <Select.Option value="completion">
                          Completion
                        </Select.Option>
                        <Select.Option value="iteration">
                          Iteration
                        </Select.Option>
                      </Select>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '200px',
                          maxWidth: '400px',
                        }}
                      >
                        {renderValueInput()}
                      </div>
                      <Button
                        size="small"
                        danger
                        type="text"
                        onClick={() => this.removeFilterRule(rule.id)}
                      >
                        ×
                      </Button>
                    </div>
                  );
                })}
              </div>
              <Button
                type="dashed"
                size="small"
                onClick={this.addFilterRule}
                block
              >
                + Add rule
              </Button>
            </div>
          )}
        </Card>
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
          showParentModal={this.showParentModal}
          filterNode={this.filterNode}
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
