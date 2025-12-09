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
  Spin,
  message,
} from 'antd';
import dateFormat from 'dateformat';
import { ipcRenderer } from 'electron';
import TabPane from 'antd/lib/tabs/TabPane';
import Layout from '../../layouts/App';
// Components
import ProjectListContainer from '../../components/Projects/ProjectListContainer';
import DayByDayCalendar from '../../components/DayByDayCalendar/DayByDayCalendar';
import ProjectController from '../../api/project/ProjectController';
import NodeController from '../../api/nodes/NodeController';
import ParentController from '../../api/parent/ParentController';
import TimerController from '../../api/timer/TimerController';
import TagController from '../../api/tag/TagController';
// New Components
import ProjectSelector from './components/ProjectSelector/ProjectSelector';
import StatisticsCards from './components/StatisticsCards/StatisticsCards';
import AggregateView from './components/AggregateView/AggregateView';
import { loadMultipleProjectsData, getAllProjectNames } from './utils/projectDataLoader';
import {
  calculateProjectHealth,
  calculateNodeStats,
  calculateTotalTimeSpent,
} from './utils/statisticsCalculations';

/**
 * Home
 *
 * @class Dashboard
 * @extends {Component}
 */
class Dashboard extends Component {
  constructor(props) {
    super(props);

    // Load selected projects from localStorage
    const savedSelectedProjects = localStorage.getItem('dashboardSelectedProjects');
    const initialSelectedProjects = savedSelectedProjects 
      ? JSON.parse(savedSelectedProjects) 
      : [];

    this.state = {
      selectedProject: '',
      isLokiLoaded: false,
      // Multi-project state
      viewMode: 'single', // 'single' or 'aggregate'
      availableProjects: [],
      selectedProjects: initialSelectedProjects,
      projectsData: [],
      isLoadingProjects: false,
    };

    const self = this;
    ipcRenderer.on('UpdateCurrentProject', function (e, projectName) {
      self.lokiServiceLoadedCallback(projectName);
    });
  }

  componentDidMount() {
    this.loadAvailableProjects();
    if (this.state.selectedProjects.length > 0) {
      this.loadProjectsData(this.state.selectedProjects);
    }
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners('UpdateCurrentProject');
  }

  // eslint-disable-next-line react/no-unused-class-component-methods
  lokiServiceLoadedCallback = (projectName) => {
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

    // Normalize project name - remove .json extension if present
    let normalizedProjectName = projectName ? projectName.trim() : '';
    if (normalizedProjectName.endsWith('.json')) {
      normalizedProjectName = normalizedProjectName.slice(0, normalizedProjectName.lastIndexOf('.json')).trim();
    }

    const newState = {
      ...this.state,
      nodes: NodeController.getNodes(),
      parents: ParentController.getParents(),
      parentOrder: ParentController.getParentOrder(),
      nodeTypes: nodeTypeArray,
      nodeStates: nodeStateArray,
      selectedProject: normalizedProjectName,
      tags: tagArray,
      timerPreferences: TimerController.getTimerPreferences(),
      isLokiLoaded: true,
    };

    this.setState(newState);
  };

  // eslint-disable-next-line class-methods-use-this
  getProjectTotalTimeSpent = () => {
    try {
      const cardList = NodeController.getNodesWithQuery({
        timeSpent: { $gte: 1 },
      });

      if (!cardList) return 0;

      let totalTime = 0;
      Object.values(cardList).forEach((card) => {
        totalTime += card.timeSpent || 0;
      });

      return totalTime;
    } catch (error) {
      console.error('Error getting project total time:', error);
      return 0;
    }
  };

  // eslint-disable-next-line class-methods-use-this
  getListData = (value) => {
    try {
      const listData = [];
      // eslint-disable-next-line no-underscore-dangle
      const cellDate = dateFormat(value._d, 'yyyy-mm-dd');
      const dueItems = NodeController.getNodesWithQuery({
        estimatedDate: { $ne: '' },
      });

      if (!dueItems) return [];

      Object.values(dueItems).forEach((item) => {
        if (item && item.estimatedDate && dateFormat(item.estimatedDate, 'yyyy-mm-dd') === cellDate) {
          listData.push({ type: 'success', content: item.title });
        }
      });

      return listData || [];
    } catch (error) {
      console.error('Error getting list data:', error);
      return [];
    }
  };

  // eslint-disable-next-line class-methods-use-this
  updateSelectedProject = (projectName) => {
    if (projectName) {
      const normalizedName = projectName.trim();
      // Reset loading state when selecting a new project
      this.setState({ 
        selectedProject: normalizedName, 
        viewMode: 'single',
        isLokiLoaded: false,
        nodes: null,
        parents: null,
      });
      ProjectController.openProject(normalizedName);
    }
  };

  loadAvailableProjects = () => {
    try {
      const projects = getAllProjectNames();
      this.setState({ availableProjects: projects });
    } catch (error) {
      console.error('Error loading available projects:', error);
      message.error('Failed to load available projects');
    }
  };

  handleProjectSelectionChange = (selectedProjects) => {
    this.setState({ selectedProjects, isLoadingProjects: true });
    localStorage.setItem('dashboardSelectedProjects', JSON.stringify(selectedProjects));
    
    if (selectedProjects.length > 0) {
      this.loadProjectsData(selectedProjects);
    } else {
      this.setState({ projectsData: [], isLoadingProjects: false });
    }
  };

  handleSelectAll = () => {
    const { availableProjects } = this.state;
    this.handleProjectSelectionChange([...availableProjects]);
  };

  handleDeselectAll = () => {
    this.handleProjectSelectionChange([]);
  };

  loadProjectsData = async (projectNames) => {
    this.setState({ isLoadingProjects: true });
    try {
      const projectsData = await loadMultipleProjectsData(projectNames);
      this.setState({ projectsData, isLoadingProjects: false });
    } catch (error) {
      console.error('Error loading projects data:', error);
      message.error('Failed to load project data');
      this.setState({ isLoadingProjects: false });
    }
  };

  handleViewModeChange = (mode) => {
    this.setState({ viewMode: mode });
  };

  handleProjectClick = (projectName) => {
    this.updateSelectedProject(projectName);
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
    try {
      const listData = [];
      // eslint-disable-next-line no-underscore-dangle
      const cellDate = dateFormat(value._d, 'yyyy-mm-dd');
      const dueItems = NodeController.getNodesWithQuery({
        estimatedDate: { $ne: '' },
      });

      if (!dueItems) {
        return (
          <List
            size="large"
            header={header()}
            style={{ height: '100%' }}
            dataSource={[]}
            renderItem={() => null}
          />
        );
      }

      Object.values(dueItems).forEach((item) => {
        if (item && item.estimatedDate && dateFormat(item.estimatedDate, 'yyyy-mm-dd') === cellDate) {
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
    } catch (error) {
      console.error('Error in dayCellRender:', error);
      return (
        <List
          size="large"
          header={header()}
          style={{ height: '100%' }}
          dataSource={[]}
          renderItem={() => null}
        />
      );
    }
  };

  render() {
    const { 
      selectedProject, 
      viewMode, 
      availableProjects, 
      selectedProjects, 
      projectsData, 
      isLoadingProjects,
      nodes,
      parents,
      isLokiLoaded,
    } = this.state;

    // Calculate single project stats
    let singleProjectStats = null;
    if (selectedProject && nodes && parents && isLokiLoaded) {
      try {
        const nodesArray = Object.values(nodes);
        const parentsArray = Object.values(parents);
        const nodeStats = calculateNodeStats(nodesArray);
        const totalTime = calculateTotalTimeSpent(nodesArray);
        const health = calculateProjectHealth(nodesArray, parentsArray);
        
        singleProjectStats = {
          totalTimeSpent: totalTime,
          totalNodes: nodeStats.total,
          completed: nodeStats.completed,
          incomplete: nodeStats.incomplete,
          completionRate: nodeStats.completionRate,
          overdueCount: health.overdueCount,
        };
      } catch (error) {
        console.error('Error calculating single project stats:', error);
      }
    }

    return (
      <Layout>
        <div className="home">
          <div className="flex">
            <div className="project-sidebar">
              <ProjectListContainer
                openProjectDetails={this.updateSelectedProject}
                selectedProject={selectedProject}
              />
              <ProjectSelector
                availableProjects={availableProjects}
                selectedProjects={selectedProjects}
                onSelectionChange={this.handleProjectSelectionChange}
                onSelectAll={this.handleSelectAll}
                onDeselectAll={this.handleDeselectAll}
              />
            </div>
            <div className="dashboard-content">
              <Tabs 
                activeKey={viewMode} 
                onChange={this.handleViewModeChange}
                defaultActiveKey="single"
              >
                <TabPane tab="Single Project" key="single">
                  {selectedProject ? (
                    <>
                      <PageHeader
                        ghost={false}
                        title={
                          <Link to={`/projectPage/${selectedProject}`}>
                            {selectedProject}
                          </Link>
                        }
                      >
                        {singleProjectStats && (
                          <StatisticsCards stats={singleProjectStats} />
                        )}
                        {isLokiLoaded ? (
                          <div style={{ display: 'flex', marginTop: '24px' }}>
                            <div style={{ width: '50%', paddingRight: '12px' }}>
                              <Descriptions size="small" column={1}>
                                <Descriptions.Item label="Time Spent">
                                  {new Date(this.getProjectTotalTimeSpent() * 1000)
                                    .toISOString()
                                    .substr(11, 8)}
                                </Descriptions.Item>
                              </Descriptions>
                            </div>
                            <div style={{ width: '50%', paddingLeft: '12px' }}>
                              <DayByDayCalendar
                                dayCellRender={this.dayCellRender}
                              />
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Spin size="large" />
                            <div style={{ marginTop: '16px', color: '#666' }}>Loading project data...</div>
                          </div>
                        )}
                      </PageHeader>
                      {isLokiLoaded && (
                        <Tabs defaultActiveKey="daily" style={{ marginTop: '24px' }}>
                          <TabPane tab="Daily" key="daily">
                            <div style={{ padding: '16px' }}>
                              <DayByDayCalendar
                                dayCellRender={this.dayCellRender}
                              />
                            </div>
                          </TabPane>
                          <TabPane tab="Monthly" key="monthly">
                            <div style={{ padding: '16px' }}>
                              <Calendar dateCellRender={this.dateCellRender} />
                            </div>
                          </TabPane>
                        </Tabs>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      Select a project to view details
                    </div>
                  )}
                </TabPane>
                <TabPane tab="Multi-Project Aggregate" key="aggregate">
                  <AggregateView
                    projectsData={projectsData}
                    selectedProjects={selectedProjects}
                    onProjectClick={this.handleProjectClick}
                    isLoading={isLoadingProjects}
                  />
                </TabPane>
              </Tabs>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
}

export default Dashboard;
