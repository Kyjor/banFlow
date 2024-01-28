import React, { Component, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { createSharedStore } from '../../stores'; // or wherever the above file is stored
import AntTreeSelect from '../../components/TreeSelect/AntTreeSelect';
import Timer from '../../components/Timer/timer';
import projectController from '../../api/project/ProjectController';
import lokiService from '../../services/LokiService';
import nodeController from '../../api/nodes/NodeController';
import timerController from '../../api/timer/TimerController';
import ISO8601ServiceInstance from '../../services/ISO8601Service';
// eslint-disable-next-line import/named
import { individualProjectState } from '../../stores/shared';

const sharedIndividualProjectState = createSharedStore(individualProjectState, {
  name: 'individualProjectState',
});

const titleBarStyle = {
  WebkitAppRegion: 'drag',
  height: '15px',
  backgroundColor: 'black',
};

class TimerPage extends Component {
  constructor(props) {
    super(props);

    this.state = {};
    sharedIndividualProjectState.subscribe((state) => {
      this.setState(state);
    });
  }

  componentDidMount() {
    const self = this;
    ipcRenderer.on('RetrieveProjectName', function (e, projectName) {
      if (!self.state.lokiLoaded) {
        projectController.setCurrentProjectName(projectName);
        lokiService.init(() => {
          sharedIndividualProjectState.setState((state) => {
            state.lokiLoaded = true;
          });
        });
      }
    });
    ipcRenderer.on('RetrieveProjectState', function (e, state) {
      sharedIndividualProjectState.setState((currentState) => {
        // eslint-disable-next-line no-restricted-syntax
        for (const property in state) {
          // eslint-disable-next-line no-continue
          if (property === 'lokiLoaded') continue;
          currentState[property] = state[property];
        }
      });
    });
    ipcRenderer.on('SaveBeforeClose', function () {
      self.saveCurrentSelectedNodeTime();
    });
  }

  updateSeconds = (seconds) => {
    const { currentNodeSelectedInTimer } = this.state;

    sharedIndividualProjectState.setState((state) => {
      state.nodes[currentNodeSelectedInTimer].timeSpent = seconds;
    });
  };

  // eslint-disable-next-line class-methods-use-this
  updateSelectedNode = (selectedNode) => {
    if (!selectedNode) {
      return;
    }

    sharedIndividualProjectState.setState((state) => {
      state.currentNodeSelectedInTimer = selectedNode;
    });
  };

  endSession = (_seconds) => {
    const { currentNodeSelectedInTimer } = this.state;
    // add a new session to node session history
    const nodeHistory = nodeController.getNode(
      currentNodeSelectedInTimer,
    ).sessionHistory;
    nodeHistory[nodeHistory.length - 1] = {
      ...nodeHistory[nodeHistory.length - 1],
      finishDateTime: ISO8601ServiceInstance.getISO8601Time(),
      length: _seconds - nodeHistory[nodeHistory.length - 1].startingSeconds,
    };

    nodeController.updateNodeProperty(
      `sessionHistory`,
      currentNodeSelectedInTimer,
      nodeHistory,
    );
    this.saveCurrentSelectedNodeTime();

    sharedIndividualProjectState.setState((state) => {
      state.isTimerRunning = false;
    });
  };

  startSession = () => {
    const { currentNodeSelectedInTimer, nodes } = this.state;
    // add a new session to node session history
    const node = nodeController.getNode(currentNodeSelectedInTimer);
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

    nodeController.updateNodeProperty(
      `sessionHistory`,
      currentNodeSelectedInTimer,
      nodeHistory,
    );

    sharedIndividualProjectState.setState((state) => {
      state.isTimerRunning = true;
    });
  };

  saveCurrentSelectedNodeTime = () => {
    const { currentNodeSelectedInTimer, nodes } = this.state;

    // save current node time
    if (currentNodeSelectedInTimer) {
      nodeController.updateNodeProperty(
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
        {currentNodeSelectedInTimer && nodes && lokiLoaded ? (
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
