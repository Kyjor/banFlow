import React, { Component, useEffect } from 'react';
import { tauriInvoke, tauriSendSync, tauriSend, tauriOn } from '../../utils/tauri';
import AntTreeSelect from '../../components/TreeSelect/AntTreeSelect';
import Timer from '../../components/Timer/timer';
import ISO8601ServiceInstance from '../../services/ISO8601Service';
import NodeController from '../../api/nodes/NodeController';
import timerController from '../../api/timer/TimerController';
import eventSystem, { EVENTS } from '../../services/EventSystem';
import {
  defaultTimerPreferences,
  normalizeTimerPreferences,
} from '../../stores/shared';

const titleBarStyle = {
  WebkitAppRegion: 'drag',
  height: '15px',
  backgroundColor: 'black',
};

class TimerPage extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  async componentDidMount() {
    const self = this;
    const unlisten1 = await tauriOn('UpdateProjectPageState', function (e, newState) {
      if (!newState || typeof newState !== 'object') {
        return;
      }
      self.setState((prevState) => {
        // Periodic saves emit full nodes; applying them re-renders and stutters the tick
        if (prevState.isTimerRunning && newState.nodes) {
          const { nodes, ...rest } = newState;
          return { ...prevState, ...rest };
        }

        const merged = { ...prevState, ...newState };
        if (newState.nodes) {
          merged.nodes = { ...prevState.nodes, ...newState.nodes };
        }
        return merged;
      });
    });
    this.unlistenUpdateProjectPageState = unlisten1;

    const unlisten2 = await tauriOn('SaveBeforeClose', function () {
      self.saveCurrentSelectedNodeTime(undefined, true);
    });
    this.unlistenSaveBeforeClose = unlisten2;

    // Listen for timer initialization events (from msg_from_renderer)
    const unlisten3 = await tauriOn('DefaultNode', function (e, node) {
      console.log('[TimerPage] Received DefaultNode:', node);
      self.setState((prevState) => ({
        ...prevState,
        currentNodeSelectedInTimer: node?.id || prevState.currentNodeSelectedInTimer,
        nodes: { ...prevState.nodes, [node.id]: node },
      }));
    });
    this.unlistenDefaultNode = unlisten3;

    const unlisten4 = await tauriOn('RetrieveProjectName', function (e, projectName) {
      console.log('[TimerPage] Received RetrieveProjectName:', projectName);
      // Set localStorage so NodeController and other controllers can find the project
      if (projectName) {
        localStorage.setItem('currentProject', projectName);
      }
      self.setState((prevState) => ({
        ...prevState,
        projectName,
      }));
      self.loadTimerPreferences();
    });
    this.unlistenRetrieveProjectName = unlisten4;

    const unlisten5 = await tauriOn('RetrieveProjectState', function (e, stateInit) {
      console.log('[TimerPage] Received RetrieveProjectState:', stateInit);
      self.setState((prevState) => ({
        ...prevState,
        ...stateInit,
      }));
    });
    this.unlistenRetrieveProjectState = unlisten5;

    const unlisten6 = await tauriOn('RetrieveTimerPrefs', function () {
      self.loadTimerPreferences();
    });
    this.unlistenRetrieveTimerPrefs = unlisten6;

    await tauriInvoke('api:getProjectState');
    this.loadTimerPreferences();
  }

  loadTimerPreferences = async () => {
    try {
      const prefs = await timerController.getTimerPreferences();
      this.setState({
        timerPreferences: normalizeTimerPreferences(prefs),
      });
    } catch (error) {
      console.error('[TimerPage] Failed to load timer preferences:', error);
      this.setState({ timerPreferences: { ...defaultTimerPreferences } });
    }
  };

  componentWillUnmount() {
    if (this.unlistenUpdateProjectPageState) {
      this.unlistenUpdateProjectPageState();
    }
    if (this.unlistenSaveBeforeClose) {
      this.unlistenSaveBeforeClose();
    }
    if (this.unlistenDefaultNode) {
      this.unlistenDefaultNode();
    }
    if (this.unlistenRetrieveProjectName) {
      this.unlistenRetrieveProjectName();
    }
    if (this.unlistenRetrieveProjectState) {
      this.unlistenRetrieveProjectState();
    }
    if (this.unlistenRetrieveTimerPrefs) {
      this.unlistenRetrieveTimerPrefs();
    }
  }

  updateSeconds = (seconds) => {
    const { currentNodeSelectedInTimer, nodes } = this.state;

    if (!currentNodeSelectedInTimer || !nodes || !nodes[currentNodeSelectedInTimer]) {
      return;
    }

    this.setState((prevState) => ({
      ...prevState,
      nodes: {
        ...prevState.nodes,
        [currentNodeSelectedInTimer]: {
          ...prevState.nodes[currentNodeSelectedInTimer],
          timeSpent: seconds,
        },
      },
    }));
  };

  // eslint-disable-next-line class-methods-use-this
  updateSelectedNode = async (selectedNode) => {
    if (!selectedNode) {
      return;
    }
    const newState = {
      ...this.state,
      currentNodeSelectedInTimer: selectedNode,
    };

    await tauriInvoke('api:setProjectState', {
      newState: newState,
    });
  };

  endSession = async (_seconds) => {
    const { currentNodeSelectedInTimer, nodes } = this.state;
    if (!currentNodeSelectedInTimer || !nodes || !nodes[currentNodeSelectedInTimer]) {
      return;
    }
    // add a new session to node session history
    const nodeHistory = nodes[currentNodeSelectedInTimer].sessionHistory;
    const sessionLength =
      _seconds - nodeHistory[nodeHistory.length - 1].startingSeconds;
    nodeHistory[nodeHistory.length - 1] = {
      ...nodeHistory[nodeHistory.length - 1],
      finishDateTime: ISO8601ServiceInstance.getISO8601Time(),
      length: sessionLength,
    };

    NodeController.updateNodeProperty(
      `sessionHistory`,
      currentNodeSelectedInTimer,
      nodeHistory,
    );
    await this.saveCurrentSelectedNodeTime(_seconds, true);

    // Fire session completed event for game system
    const node = nodes[currentNodeSelectedInTimer];
    eventSystem.emit(EVENTS.SESSION_COMPLETED, {
      duration: sessionLength,
      nodeId: currentNodeSelectedInTimer,
      nodeTitle: node?.title || '',
    });

    const newState = {
      ...this.state,
      isTimerRunning: false,
    };
    await tauriInvoke('api:setProjectState', {
      newState: newState,
    });
  };

  startSession = async () => {
    const { currentNodeSelectedInTimer, nodes, projectName } = this.state;
    if (!currentNodeSelectedInTimer || !nodes || !nodes[currentNodeSelectedInTimer]) {
      console.error('[TimerPage] Cannot start session: node not found in local state', {
        currentNodeSelectedInTimer,
        hasNodes: !!nodes,
        nodeKeys: nodes ? Object.keys(nodes) : [],
        projectName,
      });
      throw new Error('Node not found in local state');
    }
    
    // Verify the node exists in the backend before trying to update
    const node = nodes[currentNodeSelectedInTimer];
    if (!node || !node.id) {
      console.error('[TimerPage] Node object is invalid', { node, currentNodeSelectedInTimer });
      throw new Error('Node object is invalid');
    }
    
    // add a new session to node session history
    const nodeHistory = node.sessionHistory || [];
    nodeHistory.push({
      comment: '',
      parent: node.parent,
      item: node.title,
      finishDateTime: '',
      length: 0,
      startDateTime: ISO8601ServiceInstance.getISO8601Time(),
      startingSeconds: nodes[currentNodeSelectedInTimer].timeSpent || 0,
    });

    try {
      console.log('[TimerPage] Updating session history for node:', {
        nodeId: currentNodeSelectedInTimer,
        projectName,
        nodeHistoryLength: nodeHistory.length,
      });
      await NodeController.updateNodeProperty(
        `sessionHistory`,
        currentNodeSelectedInTimer,
        nodeHistory,
      );
    } catch (error) {
      console.error('[TimerPage] Error updating session history:', error);
      console.error('[TimerPage] Node details:', {
        nodeId: currentNodeSelectedInTimer,
        nodeExists: !!nodes[currentNodeSelectedInTimer],
        projectName,
      });
      // Don't throw - allow timer to continue even if session history update fails
      // The timer can still run, we just won't have session history
    }

    const newState = {
      ...this.state,
      isTimerRunning: true,
    };

    try {
      await tauriInvoke('api:setProjectState', {
        newState: newState,
      });
    } catch (error) {
      console.error('[TimerPage] Error setting project state:', error);
      throw error;
    }
  };

  /** Fire-and-forget persist; does not block the timer tick. */
  queueSaveCurrentSelectedNodeTime = (timeSpent, syncToTrello = true) => {
    void this.saveCurrentSelectedNodeTime(timeSpent, syncToTrello).catch((error) => {
      console.error('[TimerPage] Background save failed:', error);
    });
  };

  saveCurrentSelectedNodeTime = async (timeSpentOverride, syncToTrello = true) => {
    const { currentNodeSelectedInTimer, nodes, projectName } = this.state;

    // save current node time to backend
    if (currentNodeSelectedInTimer && nodes && nodes[currentNodeSelectedInTimer]) {
      const timeSpent =
        timeSpentOverride ?? nodes[currentNodeSelectedInTimer].timeSpent ?? 0;
      try {
        console.log('[TimerPage] Saving node time:', {
          nodeId: currentNodeSelectedInTimer,
          timeSpent,
          projectName,
          syncToTrello,
        });
        await NodeController.updateNodeProperty(
          'timeSpent',
          currentNodeSelectedInTimer,
          timeSpent,
          syncToTrello,
        );
      } catch (error) {
        console.error('[TimerPage] Error saving node time:', error);
        console.error('[TimerPage] Node details:', {
          nodeId: currentNodeSelectedInTimer,
          nodeExists: !!nodes[currentNodeSelectedInTimer],
          projectName,
          availableNodeIds: nodes ? Object.keys(nodes) : [],
        });
        // Don't throw - allow timer to continue even if save fails
      }
    } else {
      console.warn('[TimerPage] Cannot save node time: node not found in local state', {
        currentNodeSelectedInTimer,
        hasNodes: !!nodes,
        projectName,
      });
    }
  };

  buildTreeData = () => {
    const parentAndNodeInformation = [];

    const { parents } = this.state;
    if (!parents) {
      return parentAndNodeInformation;
    }
    Object.entries(parents).forEach(([, parent]) => {
      if (!parent.isTimed) {
        return;
      }
      if (parent.nodeIds.length !== 0) {
        parentAndNodeInformation.push({
          title: parent.title,
          value: parent.id,
          key: parent.id,
          children: [],
          selectable: false,
        });
      }
    });
    parentAndNodeInformation.forEach((parent) => {
      const { nodes } = this.state;
      Object.entries(nodes).forEach(([, node]) => {
        const nodeInfo = {
          title: node.title,
          value: node.id,
          key: node.id,
        };

        if (node.parent === parent.key) {
          parent.children.push(nodeInfo);
        }
      });
    });
    return parentAndNodeInformation;
  };

  render() {
    const {
      currentNodeSelectedInTimer,
      isTimerRunning,
      nodes,
      lokiLoaded,
      timerPreferences,
    } = this.state;
    return (
      <div className="app" style={{ overflow: 'hidden' }}>
        <div style={titleBarStyle} />
        <div
          style={{
            margin: '10px',
          }}
        />
        {lokiLoaded ? (
          <>
            {/* eslint-disable-next-line no-use-before-define */}
            <TreeDisplay
              nodes={this.buildTreeData()}
              updateSelectedNode={this.updateSelectedNode}
              currentNode={currentNodeSelectedInTimer}
              isTimerRunning={isTimerRunning}
            />
            <Timer
              endSession={this.endSession}
              saveTime={this.queueSaveCurrentSelectedNodeTime}
              selectedNode={
                currentNodeSelectedInTimer && nodes && nodes[currentNodeSelectedInTimer]
                  ? nodes[currentNodeSelectedInTimer]
                  : null
              }
              seconds={
                currentNodeSelectedInTimer &&
                nodes &&
                nodes[currentNodeSelectedInTimer]
                  ? nodes[currentNodeSelectedInTimer].timeSpent || 0
                  : 0
              }
              startSession={this.startSession}
              timerPreferences={timerPreferences}
              updateSeconds={this.updateSeconds}
              updateTimerPreferenceProperty={(property, value) => {
                this.setState((prevState) => ({
                  timerPreferences: normalizeTimerPreferences({
                    ...(prevState.timerPreferences || defaultTimerPreferences),
                    [property]: value,
                  }),
                }));
                void timerController
                  .updateTimerPreferenceProperty(property, value)
                  .catch((error) => {
                    console.error(
                      '[TimerPage] Failed to update timer preference:',
                      error,
                    );
                  });
              }}
            />
          </>
        ) : (
          <div>Loading...</div>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
          }}
        />
      </div>
    );
  }
}

function TreeDisplay(props) {
  // eslint-disable-next-line react/prop-types
  const { currentNode, isTimerRunning, nodes, updateSelectedNode } = props;

  useEffect(() => {}, [currentNode]);
  useEffect(() => {}, [nodes]);
  return (
    <AntTreeSelect
      allowClear
      disabled={isTimerRunning}
      nodes={nodes}
      onSelect={(selectedNode) => {
        if (import.meta.env.MODE === `development`) {
          console.log(`Switching to node ${selectedNode} in timer page`);
        }
        updateSelectedNode(selectedNode);
      }}
      value={currentNode}
    />
  );
}

export default TimerPage;
