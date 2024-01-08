// Libs
import React, { Component } from 'react';
// Styles
// Layouts
import { Link } from 'react-router-dom';
import { createSharedStore } from 'electron-shared-state';
import {
  Badge,
  Button,
  Calendar,
  Checkbox,
  Descriptions,
  List,
  PageHeader,
} from 'antd';
import dateFormat from 'dateformat';
import { ipcRenderer } from 'electron';
import Layout from '../../layouts/App';
// Components
import Path from '../../components/Projects/Path';
import ProjectListContainer from '../../components/Projects/ProjectListContainer';
import DayByDayCalendar from '../../components/DayByDayCalendar/DayByDayCalendar';
import {
  controllers,
  defaultTimerPreferences,
  initialIndividualProjectState,
  lokiService,
} from '../../stores/shared';

const sharedIndividualProjectState = createSharedStore(
  initialIndividualProjectState,
);
const sharedControllers = createSharedStore(controllers);
const sharedLokiService = createSharedStore(lokiService);

/**
 * Home
 *
 * @class Dashboard
 * @extends {Component}
 */
class Dashboard extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedProject: '',
      isLokiLoaded: false,
    };
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners();
  }

  lokiServiceLoadedCallback = () => {
    const { nodeStates, nodeTypes, tags } =
      sharedLokiService.getState().lokiService;

    const nodeTypeList = nodeTypes.find({ Id: { $ne: null } });
    const nodeTypeArray = [];
    const nodeStateList = nodeStates.find({ Id: { $ne: null } });
    const nodeStateArray = [];
    const tagList = tags.find({ Id: { $ne: null } });
    const tagArray = [];

    nodeTypeList.forEach((thisNodeType) => {
      nodeTypeArray.push(thisNodeType.title);
    });
    nodeStateList.forEach((thisNodeState) => {
      nodeStateArray.push(thisNodeState.title);
    });
    tagList.forEach((thisTag) => {
      tagArray.push(thisTag.title);
    });

    const newState = {
      ...this.state,
      nodes: sharedControllers.getState().nodeController.getNodes(),
      parents: sharedControllers.getState().parentController.getParents(),
      parentOrder: sharedControllers
        .getState()
        .parentController.getParentOrder(),
      nodeTypes: nodeTypeArray,
      nodeStates: nodeStateArray,
      tags: tagArray,
      timerPreferences: sharedControllers
        .getState()
        .timerController.getTimerPreferences(),
    };

    sharedIndividualProjectState.setState((state) => {
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  getProjectTotalTimeSpent = () => {
    let totalTime = 0;
    const cardList = sharedControllers
      .getState()
      .nodeController.getNodesWithQuery({ timeSpent: { $gte: 1 } });
    cardList.forEach((card) => {
      totalTime += card.timeSpent;
    });
    return totalTime;
  };

  getListData = (value) => {
    const listData = [];
    const cellDate = dateFormat(value._d, 'yyyy-mm-dd');
    const dueItems = sharedControllers
      .getState()
      .nodeController.getNodesWithQuery({ estimatedDate: { $ne: '' } });
    dueItems.forEach((item) => {
      if (dateFormat(item.estimatedDate, 'yyyy-mm-dd') == cellDate) {
        console.log(cellDate);
        listData.push({ type: 'success', content: item.title });
      }
    });
    return listData || [];
  }

  updateSelectedProject = (projectName) => {
    if (projectName) {
      sharedControllers
        .getState()
        .projectController.setCurrentProjectName(projectName);
      sharedLokiService.getState().lokiService.init(() => {
        this.lokiServiceLoadedCallback();
        sharedIndividualProjectState.setState((state) => {
          state.lokiLoaded = true;
        });
        this.setState({ selectedProject: projectName });
      });
    }
  };

  dateCellRender = (value) => {
    const listData = this.getListData(value);
    return (
      <ul className="events">
        {listData.map((item) => (
          <li key={item.content}>
            <Badge status={item.type} text={item.content} />
          </li>
        ))}
      </ul>
    );
  };

  dayCellRender = (value, header) => {
    const listData = [];
    const cellDate = dateFormat(value._d, 'yyyy-mm-dd');
    const dueItems = sharedControllers
      .getState()
      .nodeController.getNodesWithQuery({ estimatedDate: { $ne: '' } });
    dueItems.forEach((item) => {
      if (dateFormat(item.estimatedDate, 'yyyy-mm-dd') == cellDate) {
        console.log(cellDate);
        listData.push({
          type: 'success',
          content: item.title,
          isComplete: item.isComplete,
        });
      }
    });
    return (
      <List
        size="large"
        header={header()}
        style={{ height: '100%' }}
        dataSource={listData}
        renderItem={(item) => (
          <List.Item>
            <Checkbox
              checked={item.isComplete}
              disabled
              style={{ marginRight: '5px' }}
            />
            {item.content}
          </List.Item>
        )}
      />
    );
  };

  render() {
    return (
      <Layout>
        <div className="home">
          <Path />
          <ProjectListContainer
            openProjectDetails={this.updateSelectedProject}
          />
          {this.state.selectedProject && (
            <div>
              <PageHeader
                ghost={false}
                title={
                  <Link to={`/projectPage/${this.state.selectedProject}`}>
                    {this.state.selectedProject}
                  </Link>
                }
              >
                {this.state.selectedProject && (
                  <div
                    style={{
                      display: 'flex',
                    }}
                  >
                    <div style={{ width: '50%' }}>
                      <Descriptions size="small" column={3}>
                        <Descriptions.Item label="Created by">
                          You
                        </Descriptions.Item>
                        <Descriptions.Item label="Time Spent">
                          {new Date(this.getProjectTotalTimeSpent() * 1000)
                            .toISOString()
                            .substr(11, 8)}
                        </Descriptions.Item>
                      </Descriptions>
                    </div>
                    <div style={{ width: '50%' }}>
                      <DayByDayCalendar dayCellRender={this.dayCellRender} />
                    </div>
                  </div>
                )}
              </PageHeader>

              <div>
                <Calendar dateCellRender={this.dateCellRender} />,
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }
}

export default Dashboard;
