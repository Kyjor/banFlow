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
  Modal,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  Tooltip,
  Tag,
} from 'antd';
import {
  PlusOutlined,
} from '@ant-design/icons';
import dateFormat from 'dateformat';
import moment from 'moment';
import { ipcRenderer } from 'electron';
import TabPane from 'antd/lib/tabs/TabPane';
import Layout from '../../layouts/App';
import { Typography } from 'antd';

const { Text } = Typography;
// Components
import ProjectListContainer from '../../components/Projects/ProjectListContainer';
import DayByDayCalendar from '../../components/DayByDayCalendar/DayByDayCalendar';
import ProjectController from '../../api/project/ProjectController';
import NodeController from '../../api/nodes/NodeController';
import ParentController from '../../api/parent/ParentController';
import TimerController from '../../api/timer/TimerController';
import TagController from '../../api/tag/TagController';
// New Components
import StatisticsCards from './components/StatisticsCards/StatisticsCards';
import AggregateView from './components/AggregateView/AggregateView';
import { loadMultipleProjectsData, getAllProjectNames } from './utils/projectDataLoader';
import {
  calculateProjectHealth,
  calculateNodeStats,
  calculateTotalTimeSpent,
  formatTimeHuman,
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

    // Load selected projects from localStorage, default to all
    const savedSelectedProjects = localStorage.getItem('dashboardSelectedProjects');
    const allProjects = getAllProjectNames();
    const initialSelectedProjects = savedSelectedProjects 
      ? JSON.parse(savedSelectedProjects) 
      : allProjects; // Default to all projects

    this.state = {
      selectedProject: '',
      isLokiLoaded: false,
      // Multi-project state
      viewMode: 'aggregate', // Default to aggregate view
      availableProjects: allProjects,
      selectedProjects: initialSelectedProjects,
      projectsData: [],
      isLoadingProjects: false,
      quickAddModalVisible: false,
      quickAddProject: null,
      quickAddTitle: '',
      quickAddDueDate: null,
      calendarItemModalVisible: false,
      selectedCalendarItem: null,
      selectedDate: new Date(), // For single project view calendar sync
    };

    const self = this;
    ipcRenderer.on('UpdateCurrentProject', function (e, projectName) {
      self.lokiServiceLoadedCallback(projectName);
    });
  }

  componentDidMount() {
    this.loadAvailableProjects();
    // Load all projects by default
    const allProjects = getAllProjectNames();
    if (allProjects.length > 0) {
      this.setState({ 
        availableProjects: allProjects,
        selectedProjects: allProjects,
      }, () => {
        this.loadProjectsData(allProjects);
      });
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

  getListData = (value) => {
    try {
      const listData = [];
      // eslint-disable-next-line no-underscore-dangle
      const cellDate = dateFormat(value._d, 'yyyy-mm-dd');
      
      // Get todos from all projects in projectsData
      const { projectsData } = this.state;
      
      if (projectsData && projectsData.length > 0) {
        projectsData.forEach((project) => {
          const nodes = project.nodes || [];
          nodes.forEach((node) => {
            // Check dueDate, estimatedDate, or any date field
            let nodeDate = null;
            if (node.dueDate) {
              nodeDate = dateFormat(node.dueDate, 'yyyy-mm-dd');
            } else if (node.estimatedDate) {
              nodeDate = dateFormat(node.estimatedDate, 'yyyy-mm-dd');
            }
            
            if (nodeDate === cellDate) {
              listData.push({ 
                type: node.isComplete ? 'default' : 'success', 
                content: node.title,
                projectName: project.projectName,
                isComplete: node.isComplete,
                nodeId: node.id,
                node: node, // Store full node data
              });
            }
          });
        });
      }

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
    // Check if this date is from a different month
    const cellMoment = moment(value);
    const currentMonth = moment(this.state.selectedDate || moment());
    
    // If date is from a different month, return null to hide it
    if (!cellMoment.isSame(currentMonth, 'month')) {
      return null;
    }
    
    const listData = this.getListData(value);
    return (
      <ul className="events">
        {listData.map((item, index) => (
          <li key={`${item.content}-${index}`}>
            <Tooltip title={`${item.content} - ${item.projectName}`}>
              <Badge 
                status={item.type} 
                text={item.content}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  this.setState({
                    calendarItemModalVisible: true,
                    selectedCalendarItem: item,
                  });
                }}
              />
            </Tooltip>
          </li>
        ))}
      </ul>
    );
  };

  dayCellRender = (value, header) => {
    try {
      const listData = [];
      // eslint-disable-next-line no-underscore-dangle
      const cellDate = dateFormat(value._d, 'yyyy-mm-dd');
      
      // Get todos from all projects in projectsData
      const { projectsData } = this.state;
      
      if (projectsData && projectsData.length > 0) {
        projectsData.forEach((project) => {
          const nodes = project.nodes || [];
          nodes.forEach((node) => {
            // Check dueDate, estimatedDate, or any date field
            let nodeDate = null;
            if (node.dueDate) {
              nodeDate = dateFormat(node.dueDate, 'yyyy-mm-dd');
            } else if (node.estimatedDate) {
              nodeDate = dateFormat(node.estimatedDate, 'yyyy-mm-dd');
            }
            
            if (nodeDate === cellDate) {
              listData.push({
                type: node.isComplete ? 'default' : 'success',
                content: node.title,
                projectName: project.projectName,
                isComplete: node.isComplete,
                nodeId: node.id,
                node: node, // Store full node data
              });
            }
          });
        });
      }

      return (
        <List
          size="large"
          header={header()}
          style={{ height: '100%' }}
          dataSource={listData}
          renderItem={(item) => (
            <List.Item
              style={{ 
                cursor: 'pointer',
                padding: '8px',
                backgroundColor: item.isComplete ? '#f0f0f0' : 'transparent',
              }}
              onClick={() => {
                this.setState({
                  calendarItemModalVisible: true,
                  selectedCalendarItem: item,
                });
              }}
            >
              <Checkbox
                checked={item.isComplete}
                disabled
                style={{ marginRight: '8px' }}
              />
              <Tooltip title={`Project: ${item.projectName}`}>
                <span style={{ flex: 1 }}>{item.content}</span>
              </Tooltip>
              <Badge 
                text={item.projectName} 
                style={{ fontSize: '11px', color: '#999' }}
              />
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
            </div>
            <div className="dashboard-content">
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Quick Add button temporarily hidden */}
                {false && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      this.setState({ 
                        quickAddModalVisible: true,
                        quickAddProject: this.state.availableProjects[0] || null,
                        quickAddTitle: '',
                        quickAddDueDate: null,
                      });
                    }}
                  >
                    Quick Add Todo
                  </Button>
                )}
              </div>
              <Tabs 
                activeKey={viewMode} 
                onChange={this.handleViewModeChange}
                defaultActiveKey="aggregate"
              >
                <TabPane tab="All Projects" key="aggregate">
                  <AggregateView
                    projectsData={projectsData}
                    selectedProjects={selectedProjects}
                    onProjectClick={this.handleProjectClick}
                    isLoading={isLoadingProjects}
                    dayCellRender={this.dayCellRender}
                    dateCellRender={this.dateCellRender}
                  />
                </TabPane>
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
                      </PageHeader>
                      {isLokiLoaded ? (
                        <div style={{ marginTop: '24px' }}>
                          {/* Bottom section with two calendars */}
                          <div style={{ 
                            display: 'flex', 
                            gap: '16px',
                            marginTop: '24px',
                          }}>
                            {/* Left: Full Calendar */}
                            <div style={{ 
                              width: '50%',
                              paddingRight: '8px',
                            }}>
                              <div style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '12px',
                                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.1)',
                                padding: '20px',
                                border: '1px solid rgba(0, 0, 0, 0.06)',
                                height: '400px',
                                overflow: 'auto',
                              }}>
                                <Calendar
                                  value={moment(this.state.selectedDate)}
                                  onSelect={(date) => {
                                    this.setState({ selectedDate: date });
                                  }}
                                  dateCellRender={this.dateCellRender}
                                  fullscreen={false}
                                  validRange={[
                                    moment(this.state.selectedDate).startOf('month'),
                                    moment(this.state.selectedDate).endOf('month')
                                  ]}
                                />
                              </div>
                            </div>
                            {/* Right: Day by Day Calendar */}
                            <div style={{ 
                              width: '50%',
                              paddingLeft: '8px',
                            }}>
                              <DayByDayCalendar
                                dayCellRender={this.dayCellRender}
                                currentDate={this.state.selectedDate}
                                onDateChange={(date) => {
                                  this.setState({ selectedDate: date });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                          <Spin size="large" />
                          <div style={{ marginTop: '16px', color: '#666' }}>Loading project data...</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      Select a project to view details
                    </div>
                  )}
                </TabPane>
              </Tabs>
              
              {/* Quick Add Modal */}
              <Modal
                title="Quick Add Todo"
                open={this.state.quickAddModalVisible}
                onOk={this.handleQuickAdd}
                onCancel={() => this.setState({ quickAddModalVisible: false })}
                okText="Add"
                cancelText="Cancel"
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text strong>Project</Text>
                    <Select
                      value={this.state.quickAddProject}
                      onChange={(value) => this.setState({ quickAddProject: value })}
                      style={{ width: '100%', marginTop: 8 }}
                      placeholder="Select project"
                    >
                      {this.state.availableProjects.map((project) => (
                        <Select.Option key={project} value={project}>
                          {project}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Text strong>Title</Text>
                    <Input
                      value={this.state.quickAddTitle}
                      onChange={(e) => this.setState({ quickAddTitle: e.target.value })}
                      placeholder="Enter todo title"
                      style={{ marginTop: 8 }}
                      onPressEnter={this.handleQuickAdd}
                    />
                  </div>
                  <div>
                    <Text strong>Due Date (Optional)</Text>
                    <DatePicker
                      value={this.state.quickAddDueDate}
                      onChange={(date) => this.setState({ quickAddDueDate: date })}
                      style={{ width: '100%', marginTop: 8 }}
                      showTime={false}
                    />
                  </div>
                </Space>
              </Modal>
              
              {/* Calendar Item Detail Modal */}
              <Modal
                title="Todo Details"
                open={this.state.calendarItemModalVisible}
                onCancel={() => this.setState({ calendarItemModalVisible: false, selectedCalendarItem: null })}
                footer={[
                  <Button
                    key="open"
                    type="primary"
                    onClick={() => {
                      const item = this.state.selectedCalendarItem;
                      if (item) {
                        const projectName = item.projectName.replace(/\//g, '@');
                        window.location.hash = `#/projectPage/${projectName}?node=${item.nodeId}`;
                        this.setState({ calendarItemModalVisible: false, selectedCalendarItem: null });
                      }
                    }}
                  >
                    Open in Project
                  </Button>,
                  <Button
                    key="close"
                    onClick={() => this.setState({ calendarItemModalVisible: false, selectedCalendarItem: null })}
                  >
                    Close
                  </Button>,
                ]}
                width={600}
              >
                {this.state.selectedCalendarItem && (() => {
                  const item = this.state.selectedCalendarItem;
                  const node = item.node || {};
                  
                  // Format date
                  const formatDate = (dateStr) => {
                    if (!dateStr) return 'Not set';
                    try {
                      return dateFormat(new Date(dateStr), 'mmmm dd, yyyy');
                    } catch {
                      return dateStr;
                    }
                  };
                  
                  return (
                    <Descriptions column={1} bordered>
                      <Descriptions.Item label="Title">
                        {item.content}
                      </Descriptions.Item>
                      <Descriptions.Item label="Project">
                        <Tag color="blue">{item.projectName}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Badge 
                          status={item.isComplete ? 'success' : 'processing'} 
                          text={item.isComplete ? 'Completed' : 'In Progress'} 
                        />
                      </Descriptions.Item>
                      {node.description && (
                        <Descriptions.Item label="Description">
                          {node.description}
                        </Descriptions.Item>
                      )}
                      {node.timeSpent > 0 && (
                        <Descriptions.Item label="Time Spent">
                          {formatTimeHuman(node.timeSpent)}
                        </Descriptions.Item>
                      )}
                      {node.dueDate && (
                        <Descriptions.Item label="Due Date">
                          {formatDate(node.dueDate)}
                        </Descriptions.Item>
                      )}
                      {node.estimatedTime > 0 && (
                        <Descriptions.Item label="Estimated Time">
                          {formatTimeHuman(node.estimatedTime)}
                        </Descriptions.Item>
                      )}
                      {node.tags && node.tags.length > 0 && (
                        <Descriptions.Item label="Tags">
                          {node.tags.map((tag, idx) => {
                            const tagName = typeof tag === 'string' ? tag : (tag.title || tag.name || tag);
                            return <Tag key={idx} color={tag.color || 'default'}>{tagName}</Tag>;
                          })}
                        </Descriptions.Item>
                      )}
                      {node.nodeState && (
                        <Descriptions.Item label="State">
                          {node.nodeState}
                        </Descriptions.Item>
                      )}
                      {node.parent && (
                        <Descriptions.Item label="Parent Column">
                          {node.parent}
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  );
                })()}
              </Modal>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  handleQuickAdd = async () => {
    const { quickAddProject, quickAddTitle, quickAddDueDate } = this.state;
    
    if (!quickAddProject || !quickAddTitle.trim()) {
      message.warning('Please select a project and enter a title');
      return;
    }

    try {
      // Open the project first
      ProjectController.openProject(quickAddProject);
      
      // Wait a bit for project to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the first parent (or default parent)
      const parents = ParentController.getParents();
      const parentOrder = ParentController.getParentOrder();
      const firstParentId = parentOrder && parentOrder.length > 0 
        ? parentOrder[0].id 
        : (parents && Object.keys(parents).length > 0 ? Object.keys(parents)[0] : null);
      
      if (!firstParentId) {
        message.error('No parent column found in project. Please create one first.');
        return;
      }

      // Create the node
      const node = await NodeController.createNode(
        'child',
        quickAddTitle.trim(),
        firstParentId,
        '', // No iteration
      );

      // If due date is set, update it
      if (quickAddDueDate) {
        const dueDateStr = dateFormat(quickAddDueDate._d || quickAddDueDate, 'yyyy-mm-dd');
        NodeController.updateNodeProperty('dueDate', node.id, dueDateStr);
      }

      message.success('Todo added successfully!');
      
      // Refresh projects data
      this.loadProjectsData(this.state.selectedProjects);
      
      // Close modal and reset
      this.setState({
        quickAddModalVisible: false,
        quickAddProject: null,
        quickAddTitle: '',
        quickAddDueDate: null,
      });
    } catch (error) {
      console.error('Error creating todo:', error);
      message.error('Failed to create todo');
    }
  };
}

export default Dashboard;
