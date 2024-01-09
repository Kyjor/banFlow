import React, { Component, useEffect, useState } from 'react';
import { ipcRenderer } from 'electron';
import { createSharedStore } from 'electron-shared-state'; // or wherever the above file is stored
import AntTreeSelect from '../../components/TreeSelect/AntTreeSelect';
import Timer from '../../components/Timer/timer';
import './TimerPage.scss';
import projectController from '../../api/project/ProjectController';
import lokiService from '../../services/LokiService';
import nodeController from '../../api/nodes/NodeController';
import timerController from '../../api/timer/TimerController';
import ISO8601ServiceInstance from '../../services/ISO8601Service';

import {
  defaultTimerPreferences,
  initialIndividualProjectState,
} from '../../stores/shared';

const sharedIndividualProjectState = createSharedStore(
  initialIndividualProjectState,
);
const sharedTimerPrefs = createSharedStore(defaultTimerPreferences);

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
          // this.lokiServiceLoadedCallback();
          sharedIndividualProjectState.setState((state) => {
            state.lokiLoaded = true;
          });
        });
      }
    });
    ipcRenderer.on('RetrieveProjectState', function (e, state) {
      sharedIndividualProjectState.setState((currentState) => {
        for (const property in state) {
          if (property == 'lokiLoaded') continue;
          currentState[property] = state[property];
        }
      });
    });
    ipcRenderer.on('RetrieveTimerPrefs', function (e, prefs) {});
    ipcRenderer.on('SaveBeforeClose', function () {
      nodeController.updateNodeProperty(
        'timeSpent',
        self.state.currentNodeSelectedInTimer,
        self.state.nodes[this.state.currentNodeSelectedInTimer].timeSpent,
      );
    });
  }

  updateTimerPreferenceProperty = (propertyToUpdate, newValue) => {
    timerController.updateTimerPreferenceProperty(propertyToUpdate, newValue);
  };

  updateSeconds = (seconds) => {
    sharedIndividualProjectState.setState((state) => {
      state.nodes[this.state.currentNodeSelectedInTimer].timeSpent = seconds;
    });
  };

  updateSelectedNode = (selectedNode) => {
    if (!selectedNode) {
      return;
    }

    // save current node time
    if (this.state.currentNodeSelectedInTimer) {
      nodeController.updateNodeProperty(
        'timeSpent',
        this.state.currentNodeSelectedInTimer,
        this.state.nodes[this.state.currentNodeSelectedInTimer].timeSpent,
      );
    }
    const { nodes } = this.state;
    const { timeSpent } = nodes[selectedNode];

    this.setState({ currentNodeSelectedInTimer: selectedNode });
    this.updateSeconds(timeSpent);
  };

  saveTime = () => {
    nodeController.updateNodeProperty(
      'timeSpent',
      this.state.currentNodeSelectedInTimer,
      this.state.nodes[this.state.currentNodeSelectedInTimer].timeSpent,
    );
  };

  endSession = (_seconds) => {
    // add a new session to node session history
    const nodeHistory = nodeController.getNode(
      this.state.currentNodeSelectedInTimer,
    ).sessionHistory;
    nodeHistory[nodeHistory.length - 1] = {
      ...nodeHistory[nodeHistory.length - 1],
      finishDateTime: ISO8601ServiceInstance.getISO8601Time(),
      length: _seconds - nodeHistory[nodeHistory.length - 1].startingSeconds,
    };

    nodeController.updateNodeProperty(
      `sessionHistory`,
      this.state.currentNodeSelectedInTimer,
      nodeHistory,
    );
    nodeController.updateNodeProperty(
      `timeSpent`,
      this.state.currentNodeSelectedInTimer,
      this.state.nodes[this.state.currentNodeSelectedInTimer].timeSpent,
    );

    sharedIndividualProjectState.setState((state) => {
      state.isTimerRunning = false;
    });
  };

  startSession = (_seconds) => {
    // add a new session to node session history
    const node = nodeController.getNode(this.state.currentNodeSelectedInTimer);
    const nodeHistory = node.sessionHistory;
    nodeHistory.push({
      comment: '',
      parent: node.parent,
      item: node.title,
      finishDateTime: '',
      length: 0,
      startDateTime: ISO8601ServiceInstance.getISO8601Time(),
      startingSeconds:
        this.state.nodes[this.state.currentNodeSelectedInTimer].timeSpent,
    });

    nodeController.updateNodeProperty(
      `sessionHistory`,
      this.state.currentNodeSelectedInTimer,
      nodeHistory,
    );

    sharedIndividualProjectState.setState((state) => {
      state.isTimerRunning = true;
    });
  };

  buildTreeData = () => {
    const parentAndNodeInformation = [];

    const { parents } = this.state;
    Object.entries(parents).forEach(([key, parent]) => {
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
      Object.entries(nodes).forEach(([key, node]) => {
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
    return (
      <div className="app" style={{ overflow: 'hidden' }}>
        <div style={titleBarStyle} />
        <div
          style={{
            margin: '10px',
          }}
        />
        {this.state.currentNodeSelectedInTimer &&
        this.state.nodes &&
        this.state.lokiLoaded ? (
          <>
            <TreeDisplay
              nodes={this.buildTreeData()}
              updateSelectedNode={this.updateSelectedNode}
              currentNode={this.state.currentNodeSelectedInTimer}
              isTimerRunning={this.state.isTimerRunning}
            />
            <Timer
              endSession={this.endSession}
              saveTime={this.saveTime}
              selectedNode={this.state.currentNodeSelectedInTimer}
              seconds={
                this.state.nodes[this.state.currentNodeSelectedInTimer]
                  .timeSpent
              }
              startSession={this.startSession}
              timerPreferences={this.state.timerPreferences}
              updateSeconds={this.updateSeconds}
              updateTimerPreferenceProperty={this.updateTimerPreferenceProperty}
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
  const [currentNode, setCurrentNode] = useState(null);
  const [nodes, setNodes] = useState(null);
  useEffect(() => {
    setCurrentNode(props.currentNode);
    props.updateSelectedNode(props.currentNode);
  }, [props.currentNode]);
  useEffect(() => {
    setNodes(props.nodes);
  }, [props.nodes]);
  return (
    <AntTreeSelect
      allowClear
      disabled={props.isTimerRunning}
      nodes={nodes}
      onSelect={(selectedNode, evt) => {
        props.updateSelectedNode(selectedNode);
      }}
      value={currentNode}
    />
  );
}

export default TimerPage;
