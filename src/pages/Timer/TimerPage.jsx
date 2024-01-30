import React, { Component, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import AntTreeSelect from '../../components/TreeSelect/AntTreeSelect';
import Timer from '../../components/Timer/timer';
import timerController from '../../api/timer/TimerController';
import ISO8601ServiceInstance from '../../services/ISO8601Service';
import NodeController from '../../api/nodes/NodeController';

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

  componentDidMount() {
    const self = this;
    ipcRenderer.on('UpdateProjectPageState', function (e, newState) {
      console.log('updating project page state ', newState);
      self.setState(newState);
    });

    ipcRenderer.on('SaveBeforeClose', function () {
      self.saveCurrentSelectedNodeTime();
    });

    ipcRenderer.invoke('api:getProjectState');
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners('UpdateProjectPageState');
    ipcRenderer.removeAllListeners('SaveBeforeClose');
  }

  updateSeconds = (seconds) => {
    const { currentNodeSelectedInTimer, nodes } = this.state;

    const updatedNode = nodes[currentNodeSelectedInTimer];
    updatedNode.timeSpent = seconds;
    const newState = {
      ...this.state,
      nodes: { ...nodes, updatedNode },
    };

    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  // eslint-disable-next-line class-methods-use-this
  updateSelectedNode = (selectedNode) => {
    if (!selectedNode) {
      return;
    }
    const newState = {
      ...this.state,
      currentNodeSelectedInTimer: selectedNode,
    };

    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  endSession = (_seconds) => {
    const { currentNodeSelectedInTimer, nodes } = this.state;
    // add a new session to node session history
    const nodeHistory = nodes[currentNodeSelectedInTimer].sessionHistory;
    nodeHistory[nodeHistory.length - 1] = {
      ...nodeHistory[nodeHistory.length - 1],
      finishDateTime: ISO8601ServiceInstance.getISO8601Time(),
      length: _seconds - nodeHistory[nodeHistory.length - 1].startingSeconds,
    };

    NodeController.updateNodeProperty(
      `sessionHistory`,
      currentNodeSelectedInTimer,
      nodeHistory,
    );
    this.saveCurrentSelectedNodeTime();
    const newState = {
      ...this.state,
      isTimerRunning: false,
    };
    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  startSession = () => {
    const { currentNodeSelectedInTimer, nodes } = this.state;
    // add a new session to node session history
    const node = nodes[currentNodeSelectedInTimer];
    const nodeHistory = node.sessionHistory;
    nodeHistory.push({
      comment: '',
      parent: node.parent,
      item: node.title,
      finishDateTime: '',
      length: 0,
      startDateTime: ISO8601ServiceInstance.getISO8601Time(),
      startingSeconds: nodes[currentNodeSelectedInTimer].timeSpent,
    });

    NodeController.updateNodeProperty(
      `sessionHistory`,
      currentNodeSelectedInTimer,
      nodeHistory,
    );

    const newState = {
      ...this.state,
      isTimerRunning: true,
    };

    ipcRenderer.invoke('api:setProjectState', {
      ...newState,
    });
  };

  saveCurrentSelectedNodeTime = () => {
    const { currentNodeSelectedInTimer, nodes } = this.state;

    // save current node time
    if (currentNodeSelectedInTimer) {
      NodeController.updateNodeProperty(
        'timeSpent',
        currentNodeSelectedInTimer,
        nodes[currentNodeSelectedInTimer].timeSpent,
      );
    }
  };

  buildTreeData = () => {
    const parentAndNodeInformation = [];

    const { parents } = this.state;
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
              saveTime={this.saveCurrentSelectedNodeTime}
              selectedNode={currentNodeSelectedInTimer}
              seconds={nodes[currentNodeSelectedInTimer].timeSpent}
              startSession={this.startSession}
              timerPreferences={timerPreferences}
              updateSeconds={this.updateSeconds}
              updateTimerPreferenceProperty={(propertyToUpdate, newValue) => {
                timerController.updateTimerPreferenceProperty(
                  propertyToUpdate,
                  newValue,
                );
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
        if (process.env.NODE_ENV === `development`) {
          console.log(`Switching to node ${selectedNode} in timer page`);
        }
        updateSelectedNode(selectedNode);
      }}
      value={currentNode}
    />
  );
}

export default TimerPage;
