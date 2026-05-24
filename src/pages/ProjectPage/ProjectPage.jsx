// Libs
import React, { Component } from 'react';
// Layouts
import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';
import {
  Button,
  Card,
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
import timerController from '../../api/timer/TimerController';
import IterationController from '../../api/iterations/IterationController';
import IterationModal from '../../components/IterationModal/IterationModal';
import ParentModal from '../../components/ParentModal/ParentModal';
import { applyProjectTheme, clearProjectTheme } from '../../utils/projectTheme';

const { RangePicker } = DatePicker;

class ProjectPage extends Component {
  static parseBanflowDescription = (description) => {
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
            if (key === 'timeSpent' && !Number.isNaN(value)) {
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

  static evaluateRule = (node, rule) => {
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
          (Array.isArray(node.tags) &&
            node.tags.some((t) => value.includes(t))) ||
          (Array.isArray(node.labels) &&
            node.labels.some((l) =>
              value.includes(typeof l === 'string' ? l : l.name),
            ))
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

  constructor(props) {
    super(props);

    const location = window.location.href; // Get the current URL
    this.projectName = location.split('/').pop();
    // Remove query parameters (everything after ?)
    [this.projectName] = this.projectName.split('?');
    // if projectname contains @ symbols, replace them with slashes
    this.projectName = this.projectName.replace(/[@]/g, '/');
    // Decode URL-encoded characters (e.g., %20 -> space)
    try {
      this.projectName = decodeURIComponent(this.projectName);
    } catch (e) {
      // If decoding fails, use the original name
      console.warn('[ProjectPage] Failed to decode project name, using original:', this.projectName);
    }
    localStorage.setItem('currentProject', this.projectName);
    this.trelloToken = localStorage.getItem('trelloToken');
    this.trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
    localStorage.setItem(`trelloKey`, this.trelloKey);

    this.state = {
      currentProjectName: this.projectName,
      currentEditIteration: null,
      isTimerRunning: false,
      iterations: {},
      selectedIteration: '',
      mustFocusNodeTitle: false,
      mustFocusParentTitle: false,
      parentModalVisible: false,
      modalParentId: null,
      filtersOpen: false,
      searchText: '',
      filterRules: [],
      queryConjunction: 'AND',
    };
  }

  async componentDidMount() {
    console.log('[ProjectPage] componentDidMount() called for project:', this.projectName);
    try {
      // Set up event listener FIRST, before initializing state
      // This ensures we catch the UpdateProjectPageState event that's emitted during initialization
      console.log('[ProjectPage] Setting up UpdateProjectPageState listener FIRST');
      const self = this;
      const unlisten = await tauriOn('UpdateProjectPageState', function (e, updatedState) {
        console.log('[ProjectPage] UpdateProjectPageState event received:', {
          hasNodes: !!updatedState.nodes,
          nodesCount: updatedState.nodes ? Object.keys(updatedState.nodes).length : 0,
          hasParents: !!updatedState.parents,
          parentsCount: updatedState.parents ? Object.keys(updatedState.parents).length : 0,
          hasParentOrder: !!updatedState.parentOrder,
          parentOrderLength: updatedState.parentOrder ? (Array.isArray(updatedState.parentOrder) ? updatedState.parentOrder.length : 0) : 0,
          lokiLoaded: updatedState.lokiLoaded,
          fullState: updatedState,
        });
        // Merge with current state (like Electron pattern)
        self.setState((prevState) => {
          const newState = {
            ...prevState,
            ...updatedState,
            // Preserve local UI state flags
            mustFocusNodeTitle: prevState.mustFocusNodeTitle,
            mustFocusParentTitle: prevState.mustFocusParentTitle,
          };
          console.log('[ProjectPage] State after merge from event:', {
            hasNodes: !!newState.nodes,
            nodesCount: newState.nodes ? Object.keys(newState.nodes).length : 0,
            hasParents: !!newState.parents,
            parentsCount: newState.parents ? Object.keys(newState.parents).length : 0,
            hasParentOrder: !!newState.parentOrder,
            parentOrderLength: newState.parentOrder ? (Array.isArray(newState.parentOrder) ? newState.parentOrder.length : 0) : 0,
          });
          if (updatedState.projectSettings) {
            applyProjectTheme(updatedState.projectSettings);
          }
          return newState;
        });
      });
      this.unlistenUpdateProjectPageState = unlisten;
      
      console.log('[ProjectPage] Calling api:initializeProjectState');
      const newState = await tauriSendSync(
        'api:initializeProjectState',
        { projectName: this.projectName },
      );
      console.log('[ProjectPage] Received state from api:initializeProjectState:', {
        hasNodes: !!newState.nodes,
        nodesCount: newState.nodes ? Object.keys(newState.nodes).length : 0,
        hasParents: !!newState.parents,
        parentsCount: newState.parents ? Object.keys(newState.parents).length : 0,
        hasParentOrder: !!newState.parentOrder,
        parentOrderLength: newState.parentOrder ? (Array.isArray(newState.parentOrder) ? newState.parentOrder.length : 0) : 0,
        lokiLoaded: newState.lokiLoaded,
        loki_loaded: newState.loki_loaded, // Check snake_case too
        projectName: newState.projectName,
        project_name: newState.project_name, // Check snake_case too
        allKeys: Object.keys(newState),
        nodesKeys: newState.nodes ? Object.keys(newState.nodes).slice(0, 5) : [],
        parentsKeys: newState.parents ? Object.keys(newState.parents).slice(0, 5) : [],
      });

      // Ensure lokiLoaded is set (handle both camelCase and snake_case)
      const lokiLoadedValue = newState.lokiLoaded ?? newState.loki_loaded ?? true;
      const projectNameValue = newState.projectName ?? newState.project_name ?? this.projectName;
      
      this.setState(
        (prevState) => {
          const mergedState = {
            ...prevState,
            ...newState,
            lokiLoaded: lokiLoadedValue,
            projectName: projectNameValue,
          };
          console.log('[ProjectPage] Setting state with merged values:', {
            hasNodes: !!mergedState.nodes,
            nodesCount: mergedState.nodes ? Object.keys(mergedState.nodes).length : 0,
            hasParents: !!mergedState.parents,
            parentsCount: mergedState.parents ? Object.keys(mergedState.parents).length : 0,
          });
          return mergedState;
        },
        () => {
          console.log('[ProjectPage] State updated after setState callback:', {
            lokiLoaded: this.state.lokiLoaded,
            hasNodes: !!this.state.nodes,
            nodesCount: this.state.nodes ? Object.keys(this.state.nodes).length : 0,
            hasParents: !!this.state.parents,
            parentsCount: this.state.parents ? Object.keys(this.state.parents).length : 0,
          });
          if (this.state.projectSettings) {
            applyProjectTheme(this.state.projectSettings);
          }
          // Check URL parameters for node or parent to open
          this.checkUrlParameters();
        },
      );

      console.log('[ProjectPage] componentDidMount() complete');
    } catch (error) {
      console.error('[ProjectPage] Error in componentDidMount():', error);
      console.error('[ProjectPage] Error stack:', error.stack);
    }
  }

  componentWillUnmount() {
    if (this.unlistenUpdateProjectPageState) {
      this.unlistenUpdateProjectPageState();
    }
    clearProjectTheme();
    // todo: close timer window
  }

  componentDidUpdate(prevProps, prevState) {
    // Check URL parameters when state updates (e.g., after nodes/parents are loaded)
    const { lokiLoaded } = this.state;
    if (!prevState.lokiLoaded && lokiLoaded) {
      this.checkUrlParameters();
    }
    if (prevState.projectSettings !== this.state.projectSettings) {
      applyProjectTheme(this.state.projectSettings);
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
    const { nodes, parents } = this.state;

    if (nodeId && nodes && nodes[nodeId]) {
      const node = nodes[nodeId];
      // Small delay to ensure modal can render
      setTimeout(() => {
        this.showModal(node);
        // Clean up URL parameter
        const newHash = hashParts[0];
        window.history.replaceState({}, '', window.location.pathname + newHash);
      }, 100);
    } else if (parentId && parents && parents[parentId]) {
      const parent = parents[parentId];
      // Small delay to ensure modal can render
      setTimeout(() => {
        this.showParentModal(parent);
        // Clean up URL parameter
        const newHash = hashParts[0];
        window.history.replaceState({}, '', window.location.pathname + newHash);
      }, 100);
    }
  };

  createNewParent = async (parentTitle) => {
    console.log('[ProjectPage] Creating parent with title:', parentTitle);
    try {
      const parent = await ParentController.createParent(parentTitle);
      console.log('[ProjectPage] Parent created via backend:', parent);

      // The backend will emit UpdateProjectPageState event with updated parents and parentOrder
      // The event listener will automatically update the state, so we don't need to manually refresh
      // Just update the mustFocusParentTitle flag
      this.setState({
        mustFocusParentTitle: true,
      });
    } catch (error) {
      console.error('[ProjectPage] Error creating parent:', error);
      console.error('[ProjectPage] Error stack:', error.stack);
    }
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

    console.log('[ProjectPage] Node created via backend:', node);

    // The backend will emit UpdateProjectPageState event with updated nodes and parents
    // The event listener will automatically update the state, so we don't need to manually refresh
    // Just update the mustFocusNodeTitle flag
    this.setState({
      mustFocusNodeTitle: true,
    });
  };

  createIteration = async (title) => {
    await IterationController.createIteration(title);

    const newState = {
      ...this.state,
      iterations: await IterationController.getIterations(),
    };

    await tauriInvoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  editIteration = async (iteration) => {
    // open modal to edit iteration
    const newState = {
      ...this.state,
      currentEditIteration: iteration,
    };

    await tauriInvoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  deleteIteration = async (iterationId) => {
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

    await IterationController.deleteIteration(iterationId);

    const newState = {
      ...this.state,
      iterations: await IterationController.getIterations(),
      selectedIteration: '',
      mustFocusNodeTitle: false,
      mustFocusParentTitle: false,
    };

    await tauriInvoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  handleIterationCancel = async () => {
    const newState = {
      ...this.state,
      currentEditIteration: null,
    };

    await tauriInvoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  setSelectedIteration = async (iteration) => {
    // TODO: IterationController.selectIteration(iteration); // Save selected iteration to db
    const newState = {
      ...this.state,
      selectedIteration: iteration || '',
    };

    await tauriInvoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  updateNodeTitle = async (newTitle, nodeId) => {
    await this.updateNodeProperty(`title`, nodeId, newTitle);
    const newState = {
      ...this.state,
      nodes: await NodeController.getNodes(),
      mustFocusNodeTitle: false,
    };
    await tauriInvoke('api:setProjectState', {
      newState: newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  showModal = async (node) => {
    console.log('[ProjectPage] showModal called for node:', node.id);
    const newState = {
      ...this.state,
      nodeModalVisible: true,
      modalNodeId: node.id,
    };
    // Set local state immediately (like Electron) so modal shows right away
    this.setState(newState);
    // Also update backend state (for consistency)
    await tauriInvoke('api:setProjectState', {
      newState: newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  showParentModal = async (parent) => {
    console.log('[ProjectPage] showParentModal called for parent:', parent.id);
    const newState = {
      ...this.state,
      parentModalVisible: true,
      modalParentId: parent.id,
    };
    // Set local state immediately (like Electron) so modal shows right away
    this.setState(newState);
    // Also update backend state (for consistency)
    await tauriInvoke('api:setProjectState', {
      newState: newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  handleParentModalCancel = async () => {
    const newState = {
      ...this.state,
      parentModalVisible: false,
      modalParentId: null,
    };
    // Set local state immediately
    this.setState(newState);
    await tauriInvoke('api:setProjectState', {
      newState: newState,
    });
  };

  deleteNode = async (nodeId, parentId) => {
    const { isTimerRunning } = this.state;
    if (isTimerRunning) {
      message.error('Stop timer before deleting');
      return;
    }

    await NodeController.deleteNode(nodeId, parentId);

    const newState = {
      ...this.state,
      nodes: await NodeController.getNodes(),
      parents: await ParentController.getParents(),
    };

    await tauriInvoke('api:setProjectState', {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      ...newState,
    });
  };

  deleteParent = async (parent) => {
    if (parent.nodeIds.length > 0) {
      message.error('Empty parent before deleting');
      return;
    }

    await ParentController.deleteParent(parent.id);

    const newState = {
      ...this.state,
      parents: await this.loadParentsFromBackend(),
      parentOrder: await this.loadParentOrderFromBackend(),
    };

    await tauriInvoke('api:setProjectState', newState);
    this.setState(newState);

    message.success('Deleted parent');
  };

  handleOk = async () => {
    const { modalNodeId, nodes } = this.state;
    const timerPreferences = await timerController.getTimerPreferences();

    await tauriInvoke('msg_from_renderer', {
      node: nodes[modalNodeId],
      projectName: this.projectName,
      stateInit: this.state,
      timerPrefs: timerPreferences,
    });
    const newState = {
      ...this.state,
      nodeModalVisible: false,
      currentNodeSelectedInTimer: modalNodeId,
      modalNodeId: null,
    };
    // Set local state immediately so modal closes right away
    this.setState(newState);
    // TODO: don't persist this
    await tauriInvoke('api:setProjectState', {
      newState: newState,
    });
    return undefined;
  };

  // eslint-disable-next-line class-methods-use-this
  handleCancel = async () => {
    const newState = {
      ...this.state,
      nodeModalVisible: false,
      modalNodeId: null,
    };
    // Set local state immediately so modal closes right away
    this.setState(newState);
    await tauriInvoke('api:setProjectState', {
      newState: newState,
    });
    return undefined;
  };

  syncTrelloCard = async (node) => {
    const { fetchTrelloCard } = await import('../../services/TrelloSyncService');
    try {
      const card = await fetchTrelloCard(node.trello.id, {
        key: this.trelloKey,
        token: this.trelloToken,
      });
      if (!card) return undefined;
        const local = new Date(node.lastUpdated);
        const remote = new Date(card.dateLastActivity);

        console.log(node);
        console.log(node.lastUpdated);
        console.log(local);
        console.log(remote);

        if (local > remote) {
          console.log('need to update remote');
          await NodeController.updateNodeProperty('title', node.id, node.title);
          return undefined;
        }
        if (!node.lastUpdated || remote.getTime() - local.getTime() >= 10000) {
          console.log('need to update local');
          console.log(card);
          await NodeController.updateNodeProperty('trello', node.id, card, false);
          if (card.name !== node.title) {
            await NodeController.updateNodeProperty(
              'title',
              node.id,
              card.name,
              false,
            );
          }

          // Parse description and BanFlow fields
          const { cleanDescription, banflowFields } =
            ProjectPage.parseBanflowDescription(card.desc);
          if (cleanDescription !== node.description) {
            await NodeController.updateNodeProperty(
              'description',
              node.id,
              cleanDescription,
              false,
            );
          }

          // Update BanFlow fields if they exist
          if (banflowFields.timeSpent !== undefined) {
            await NodeController.updateNodeProperty(
              'timeSpent',
              node.id,
              banflowFields.timeSpent,
              false,
            );
          }

          const currentParent = (await ParentController.getParents())[node.parent];
          const newParentId = card.idList;
          if (currentParent.trello && currentParent.trello.id !== newParentId) {
            console.log('need to update parent');
            // get parent where parent.trello.id === newParentId
            const allParents = await ParentController.getParents();
            const newParent = Object.values(allParents).find(
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
            await ParentController.updateNodesInParents(newStart, newFinish, node.id);
          }

          const newState = {
            ...this.state,
            nodeModalVisible: false,
            nodes: await NodeController.getNodes(),
            parents: await ParentController.getParents(),
          };
          await tauriInvoke('api:setProjectState', {
            ...newState,
          });
          return undefined;
        }
        console.log('nothing to sync here...');
        return undefined;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  // eslint-disable-next-line class-methods-use-this
  updateNodeProperty = async (
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

    await tauriInvoke('api:setProjectState', {
      newState: newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  updateParentProperty = async (propertyToUpdate, parentId, newValue) => {
    await ParentController.updateParentProperty(propertyToUpdate, parentId, newValue);

    // The backend will emit UpdateProjectPageState event with updated parents
    // The event listener will automatically update the state, so we don't need to manually refresh
  };

  updateParents = async (controllerFunction) => {
    await controllerFunction();
    const currentState = this.state;

    const newState = {
      ...currentState,
      parents: await ParentController.getParents(),
      parentOrder: await ParentController.getParentOrder(),
      nodes: await NodeController.getNodes(), // Also refresh nodes to reflect any property changes (e.g., completion status)
    };

    await tauriInvoke('api:setProjectState', {
      newState: newState,
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

  loadParentsFromBackend = async () => {
    const parents = await tauriInvoke('api:getParents', {
      projectName: this.projectName,
    });
    return parents || {};
  };

  loadParentOrderFromBackend = async () => {
    const parentOrder = await tauriInvoke('api:getParentOrder', {
      projectName: this.projectName,
    });
    return parentOrder || [];
  };

  syncProject = async (trello) => {
    try {
      message.loading({
        content: 'Loading Trello board...',
        key: 'trello-sync',
      });

      const trelloAuth = `key=${this.trelloKey}&token=${this.trelloToken}`;
      const [listsResponse, cardsResponse] = await Promise.all([
        fetch(
          `https://api.trello.com/1/boards/${trello.id}/lists?${trelloAuth}`,
          { method: 'GET', headers: { Accept: 'application/json' } },
        ),
        fetch(
          `https://api.trello.com/1/boards/${trello.id}/cards?${trelloAuth}`,
          { method: 'GET', headers: { Accept: 'application/json' } },
        ),
      ]);

      if (!listsResponse.ok) {
        throw new Error(`Failed to load Trello lists (${listsResponse.status})`);
      }
      if (!cardsResponse.ok) {
        throw new Error(`Failed to load Trello cards (${cardsResponse.status})`);
      }

      const [lists, cards] = await Promise.all([
        listsResponse.json(),
        cardsResponse.json(),
      ]);

      message.loading({
        content: `Applying sync (${lists.length} lists, ${cards.length} cards)...`,
        key: 'trello-sync',
      });

      const syncResult = await tauriInvoke('api:syncTrelloBoard', {
        projectName: this.projectName,
        lists,
        cards,
      });

      const newState = {
        ...this.state,
        nodes: syncResult?.nodes || {},
        parents: syncResult?.parents || {},
        parentOrder: syncResult?.parentOrder || [],
      };
      this.setState(newState);
      await tauriInvoke('api:setProjectState', newState);
      message.success({ content: 'Trello sync complete', key: 'trello-sync' });
    } catch (err) {
      console.error(err);
      message.error({ content: 'Trello sync failed', key: 'trello-sync' });
    }
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
                value={String(selectedIteration || '')}
                size="small"
              >
                <Select.Option key="backlog" value="">
                  Backlog
                </Select.Option>
                {iterations &&
                  Object.values(iterations).map((item) => (
                    <Select.Option key={item.id} value={item.id}>
                      {item.title}
                    </Select.Option>
                  ))}
              </Select>
              {selectedIteration && selectedIteration !== '' && (
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
                          style={commonProps.style}
                          size={commonProps.size}
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
                          style={commonProps.style}
                          size={commonProps.size}
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
                          style={commonProps.style}
                          size={commonProps.size}
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
                          style={commonProps.style}
                          size={commonProps.size}
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
                          style={commonProps.style}
                          size={commonProps.size}
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
                            style={commonProps.style}
                            size={commonProps.size}
                            placeholder="Min (seconds)"
                            value={rule.value?.min}
                            onChange={(val) =>
                              this.updateFilterRule(rule.id, {
                                value: { ...(rule.value || {}), min: val },
                              })
                            }
                          />
                          <InputNumber
                            style={commonProps.style}
                            size={commonProps.size}
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
                          style={commonProps.style}
                          size={commonProps.size}
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
                          style={commonProps.style}
                          size={commonProps.size}
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
                        style={commonProps.style}
                        size={commonProps.size}
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
          selectedIteration={String(selectedIteration || '')}
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
