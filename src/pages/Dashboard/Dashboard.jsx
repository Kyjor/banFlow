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
import TagController from '../../api/tag/TagController';

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
    ipcRenderer.on('UpdateCurrentProject', function (e, projectName) {
      self.lokiServiceLoadedCallback(projectName);
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners();
  }

  lokiServiceLoadedCallback = (projectName) => {
    // const { nodeStates, nodeTypes, tags } = this.state;

    const nodeTypeList = NodeController.getNodeTypes();
    const nodeTypeArray = [];
    const nodeStateList = NodeController.getNodeStates();
    const nodeStateArray = [];
    const tagList = TagController.getTags();
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
      nodeTypes: nodeTypeArray,
      nodeStates: nodeStateArray,
      selectedProject: projectName,
      tags: tagArray,
      timerPreferences: TimerController.getTimerPreferences(),
    };

    this.setState(newState);
  };

  // eslint-disable-next-line class-methods-use-this
  getProjectTotalTimeSpent = () => {
    let totalTime = 0;
    const cardList = NodeController.getNodesWithQuery({
      timeSpent: { $gte: 1 },
    });

    Object.values(cardList).forEach((card) => {
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
    Object.values(dueItems).forEach((item) => {
      if (dateFormat(item.estimatedDate, 'yyyy-mm-dd') === cellDate) {
        listData.push({ type: 'success', content: item.title });
      }
    });

    return listData || [];
  };

  // eslint-disable-next-line class-methods-use-this
  updateSelectedProject = (projectName) => {
    if (projectName) {
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
  dayCellRender = (value, header) => {
    const listData = [];
    // eslint-disable-next-line no-underscore-dangle
    const cellDate = dateFormat(value._d, 'yyyy-mm-dd');
    const dueItems = NodeController.getNodesWithQuery({
      estimatedDate: { $ne: '' },
    });

    Object.values(dueItems).forEach((item) => {
      if (dateFormat(item.estimatedDate, 'yyyy-mm-dd') === cellDate) {
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
    console.log('selectedProject', selectedProject);
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
                              {new Date(this.getProjectTotalTimeSpent() * 1000)
                                .toISOString()
                                .substr(11, 8)}
                            </Descriptions.Item>
                          </Descriptions>
                        </div>
                        <div style={{ width: '50%' }}>
                          <DayByDayCalendar
                            dayCellRender={this.dayCellRender}
                          />
                        </div>
                      </div>
                    )}
                  </PageHeader>
                </TabPane>
                <TabPane tab="Monthly" key="2">
                  <div>
                    <Calendar dateCellRender={this.dateCellRender} />,
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
