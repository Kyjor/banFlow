// Libs
import React, { Component } from 'react';
// Styles
// Layouts
import { Link } from 'react-router-dom';
import {
  Badge,
  Calendar,
  Checkbox,
  Descriptions,
  List,
  PageHeader,
  Tabs,
} from 'antd';
import dateFormat from 'dateformat';
import { ipcRenderer } from 'electron';
import TabPane from 'antd/lib/tabs/TabPane';
import Layout from '../../layouts/App';
// Components
import Path from '../../components/Projects/Path';
import ProjectListContainer from '../../components/Projects/ProjectListContainer';
import DayByDayCalendar from '../../components/DayByDayCalendar/DayByDayCalendar';
import ProjectController from '../../api/project/ProjectController';
import NodeController from '../../api/nodes/NodeController';
import ParentController from '../../api/parent/ParentController';
import TimerController from '../../api/timer/TimerController';

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

    const self = this;
    ipcRenderer.on('UpdateCurrentProject', function (e, newProjectNodes) {
      self.lokiServiceLoadedCallback();
      console.log('loaded ');
      self.setState({ lokiLoaded: true, selectedProject: 'julia-test' });
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners();
  }

  lokiServiceLoadedCallback = async () => {
    // const { nodeStates, nodeTypes, tags } = this.state;

    const nodeTypeList = await ipcRenderer.invoke('api:getNodeTypes');
    // nodeTypes.find({ Id: { $ne: null } });
    const nodeTypeArray = [];
    const nodeStateList = await ipcRenderer.invoke('api:getNodeStates');
    // nodeStates.find({ Id: { $ne: null } });
    const nodeStateArray = [];
    const tagList = await ipcRenderer.invoke('api:getTags');
    // tags.find({ Id: { $ne: null } });
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
      nodes: NodeController.getNodes(),
      parents: ParentController.getParents(),
      parentOrder: ParentController.getParentOrder(),
      nodeTypes: [],
      // nodeTypes: nodeTypeArray,
      nodeStates: nodeStateArray,
      tags: tagArray,
      timerPreferences: TimerController.getTimerPreferences(),
    };

    this.setState((state) => {
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      for (const property in newState) {
        state[property] = newState[property];
      }
    });
  };

  // eslint-disable-next-line class-methods-use-this
  getProjectTotalTimeSpent = async () => {
    let totalTime = 0;
    const cardList = await NodeController.getNodesWithQuery({
      timeSpent: { $gte: 1 },
    });
    cardList.forEach((card) => {
      totalTime += card.timeSpent;
    });
    return totalTime;
  };

  // eslint-disable-next-line class-methods-use-this
  getListData = async (value) => {
    const listData = [];
    // eslint-disable-next-line no-underscore-dangle
    const cellDate = dateFormat(value._d, 'yyyy-mm-dd');
    const dueItems = await NodeController.getNodesWithQuery({
      estimatedDate: { $ne: '' },
    });
    dueItems.forEach((item) => {
      if (dateFormat(item.estimatedDate, 'yyyy-mm-dd') === cellDate) {
        listData.push({ type: 'success', content: item.title });
      }
    });
    return listData || [];
  };

  // eslint-disable-next-line class-methods-use-this
  updateSelectedProject = (projectName) => {
    if (projectName) {
      console.log('Update selected');
      ProjectController.openProject(projectName);
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

  // eslint-disable-next-line class-methods-use-this
  dayCellRender = async (value, header) => {
    const listData = [];
    // eslint-disable-next-line no-underscore-dangle
    const cellDate = dateFormat(value._d, 'yyyy-mm-dd');
    const dueItems = await NodeController.getNodesWithQuery({
      estimatedDate: { $ne: '' },
    });
    dueItems.forEach((item) => {
      if (dateFormat(item.estimatedDate, 'yyyy-mm-dd') === cellDate) {
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
    const { selectedProject } = this.state;
    return (
      <Layout>
        <div className="home">
          <div>
            <Path />
          </div>
          <div className="flex">
            <ProjectListContainer
              openProjectDetails={this.updateSelectedProject}
            />
            {selectedProject && (
              <Tabs defaultActiveKey="1">
                <TabPane tab="Daily" key="1">
                  <PageHeader
                    ghost={false}
                    title={
                      <Link to={`/projectPage/${selectedProject}`}>
                        {selectedProject}
                      </Link>
                    }
                  >
                    {selectedProject && (
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
                              {new Date(1 * 1000).toISOString().substr(11, 8)}
                            </Descriptions.Item>
                          </Descriptions>
                        </div>
                        <div style={{ width: '50%' }}>
                          {/* <DayByDayCalendar */}
                          {/*  dayCellRender={this.dayCellRender} */}
                          {/* /> */}
                        </div>
                      </div>
                    )}
                  </PageHeader>
                </TabPane>

                <TabPane tab="Monthly" key="2">
                  <div>
                    {/* <Calendar dateCellRender={this.dateCellRender} />, */}
                  </div>
                </TabPane>
              </Tabs>
            )}
          </div>
        </div>
      </Layout>
    );
  }
}

export default Dashboard;
