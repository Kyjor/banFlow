import React, { Component } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Card,
  Row,
  Col,
  Tag,
  Badge,
  Tooltip,
  Checkbox,
  Dropdown,
  Menu,
  Modal,
  message,
  Statistic,
  Divider,
  DatePicker,
  Typography,
  Switch,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FilterOutlined,
  SaveOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileOutlined,
  FileTextOutlined,
  BarChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ipcRenderer } from 'electron';
import Layout from '../../layouts/App';
import NodeModal from '../../components/NodeModal/NodeModal';
import NodeController from '../../api/nodes/NodeController';
import ParentController from '../../api/parent/ParentController';
import { formatTimeHuman } from '../Dashboard/utils/statisticsCalculations';
import moment from 'moment';
import './SheetPage.scss';

const { Option } = Select;
const { Text } = Typography;
const { RangePicker } = DatePicker;

class SheetPage extends Component {
  constructor(props) {
    super(props);

    const location = window.location.href;
    this.projectName = location.split('/').pop();
    this.projectName = this.projectName.replace(/[@]/g, '/');
    localStorage.setItem('currentProject', this.projectName);
    this.currentProject = this.projectName;

    // Column presets
    this.columnPresets = {
      overview: ['title', 'parent', 'status', 'completion', 'timeSpent', 'created'],
      timeTracking: ['title', 'timeSpent', 'estimatedTime', 'parent', 'status'],
      planning: ['title', 'parent', 'dueDate', 'estimatedDate', 'status', 'tags'],
      full: 'all',
    };

    this.state = {
      lokiLoaded: false,
      nodes: {},
      parents: {},
      iterations: {},
      nodeTypes: [],
      nodeStates: [],
      // Table state
      searchText: '',
      selectedColumns: ['title', 'description', 'parent', 'status', 'completion', 'timeSpent', 'created', 'lastUpdated'],
      columnPreset: 'overview',
      // Filtering
      filters: {
        parent: null,
        status: null,
        completion: null,
        tags: null,
        dateRange: null,
      },
      // Sorting
      sortedInfo: {},
      // Pagination
      pagination: {
        current: 1,
        pageSize: 50,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} nodes`,
      },
      // Modal
      nodeModalVisible: false,
      modalNodeId: null,
      // Statistics
      showStatistics: true,
      // Grouping
      groupBy: null,
      // View management
      savedViews: JSON.parse(localStorage.getItem('sheetViews') || '[]'),
      currentView: null,
    };
  }

  componentDidMount() {
    const newState = ipcRenderer.sendSync(
      'api:initializeProjectState',
      this.projectName,
    );

    this.setState({
      ...this.state,
      ...newState,
    });

    // Listen for updates
    ipcRenderer.on('UpdateProjectPageState', this.handleStateUpdate);
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners('UpdateProjectPageState');
  }

  handleStateUpdate = (event, newState) => {
    this.setState(newState);
  };

  // Transform nodes to table data
  getTableData = () => {
    const { nodes, searchText, filters } = this.state;
    let data = Object.values(nodes || {});

    // Apply search
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      data = data.filter((node) => {
        return (
          (node.title || '').toLowerCase().includes(searchLower) ||
          (node.description || '').toLowerCase().includes(searchLower) ||
          (node.notes || '').toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply filters
    if (filters.parent) {
      data = data.filter((node) => node.parent === filters.parent);
    }
    if (filters.status) {
      data = data.filter((node) => node.nodeState === filters.status);
    }
    if (filters.completion === 'completed') {
      data = data.filter((node) => node.isComplete);
    } else if (filters.completion === 'incomplete') {
      data = data.filter((node) => !node.isComplete);
    }
    if (filters.tags && filters.tags.length > 0) {
      data = data.filter((node) => {
        if (!node.tags || node.tags.length === 0) return false;
        return filters.tags.some((tag) => node.tags.includes(tag));
      });
    }
    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      data = data.filter((node) => {
        if (!node.created) return false;
        const created = moment(node.created);
        return created.isBetween(start, end, 'day', '[]');
      });
    }

    return data;
  };

  // Get parent name
  getParentName = (parentId) => {
    const { parents } = this.state;
    if (!parentId || !parents[parentId]) return 'None';
    return parents[parentId].title;
  };

  // Group data
  getGroupedData = () => {
    const { groupBy } = this.state;
    if (!groupBy) return null;

    const data = this.getTableData();
    const grouped = {};

    data.forEach((node) => {
      let key = 'Unknown';
      if (groupBy === 'parent') {
        key = this.getParentName(node.parent);
      } else if (groupBy === 'status') {
        key = node.nodeState || 'None';
      } else if (groupBy === 'completion') {
        key = node.isComplete ? 'Completed' : 'Incomplete';
      } else if (groupBy === 'iteration') {
        key = this.getIterationName(node.iterationId);
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(node);
    });

    return grouped;
  };

  // Get iteration name
  getIterationName = (iterationId) => {
    const { iterations } = this.state;
    if (!iterationId && iterationId !== 0) return 'None';
    const iteration = iterations[iterationId];
    return iteration ? iteration.title : 'Backlog';
  };

  // Calculate statistics
  calculateStatistics = () => {
    const data = this.getTableData();
    const totalTime = data.reduce((sum, node) => sum + (node.timeSpent || 0), 0);
    const completedCount = data.filter((node) => node.isComplete).length;
    const overdueCount = data.filter((node) => {
      if (!node.dueDate) return false;
      return moment(node.dueDate).isBefore(moment(), 'day');
    }).length;
    const avgTime = data.length > 0 ? totalTime / data.length : 0;

    return {
      total: data.length,
      completed: completedCount,
      incomplete: data.length - completedCount,
      totalTime,
      avgTime,
      overdue: overdueCount,
    };
  };

  // Column definitions
  getColumns = () => {
    const { selectedColumns, sortedInfo, parents, nodeStates } = this.state;
    const allColumns = {
      title: {
        title: 'Title',
        dataIndex: 'title',
        key: 'title',
        width: 200,
        fixed: 'left',
        sorter: (a, b) => (a.title || '').localeCompare(b.title || ''),
        sortOrder: sortedInfo.columnKey === 'title' && sortedInfo.order,
        render: (text, record) => (
          <Button
            type="link"
            onClick={() => this.openNodeModal(record)}
            style={{ padding: 0, height: 'auto' }}
          >
            {text || 'Untitled'}
          </Button>
        ),
      },
      description: {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        width: 250,
        ellipsis: true,
        render: (text) => text || <span style={{ color: '#999' }}>No description</span>,
      },
      parent: {
        title: 'Parent',
        dataIndex: 'parent',
        key: 'parent',
        width: 120,
        filters: Object.values(parents || {}).map((p) => ({
          text: p.title,
          value: p.id,
        })),
        filteredValue: this.state.filters.parent ? [this.state.filters.parent] : null,
        onFilter: (value, record) => record.parent === value,
        sorter: (a, b) => {
          const aParent = this.getParentName(a.parent);
          const bParent = this.getParentName(b.parent);
          return aParent.localeCompare(bParent);
        },
        render: (parentId) => {
          const parent = parents[parentId];
          if (!parent) return <Tag>None</Tag>;
          return <Tag color="blue">{parent.title}</Tag>;
        },
      },
      status: {
        title: 'Status',
        dataIndex: 'nodeState',
        key: 'nodeState',
        width: 120,
        filters: nodeStates.map((state) => ({
          text: state.name || state,
          value: state.name || state,
        })),
        filteredValue: this.state.filters.status ? [this.state.filters.status] : null,
        onFilter: (value, record) => record.nodeState === value,
        render: (status) => {
          if (!status) return <Tag>None</Tag>;
          return <Tag color="geekblue">{status}</Tag>;
        },
      },
      completion: {
        title: 'Completion',
        dataIndex: 'isComplete',
        key: 'isComplete',
        width: 100,
        filters: [
          { text: 'Completed', value: 'completed' },
          { text: 'Incomplete', value: 'incomplete' },
        ],
        filteredValue: this.state.filters.completion ? [this.state.filters.completion] : null,
        onFilter: (value, record) => {
          if (value === 'completed') return record.isComplete;
          return !record.isComplete;
        },
        sorter: (a, b) => (a.isComplete ? 1 : 0) - (b.isComplete ? 1 : 0),
        render: (isComplete) => (
          isComplete ? (
            <Badge status="success" text="Complete" />
          ) : (
            <Badge status="default" text="Incomplete" />
          )
        ),
      },
      timeSpent: {
        title: 'Time Spent',
        dataIndex: 'timeSpent',
        key: 'timeSpent',
        width: 120,
        sorter: (a, b) => (a.timeSpent || 0) - (b.timeSpent || 0),
        sortOrder: sortedInfo.columnKey === 'timeSpent' && sortedInfo.order,
        render: (seconds) => (
          <span style={{ fontWeight: seconds > 0 ? 'bold' : 'normal' }}>
            {formatTimeHuman(seconds || 0)}
          </span>
        ),
      },
      estimatedTime: {
        title: 'Estimated Time',
        dataIndex: 'estimatedTime',
        key: 'estimatedTime',
        width: 130,
        sorter: (a, b) => (a.estimatedTime || 0) - (b.estimatedTime || 0),
        render: (seconds) => {
          if (!seconds) return <span style={{ color: '#999' }}>Not set</span>;
          return formatTimeHuman(seconds);
        },
      },
      created: {
        title: 'Created',
        dataIndex: 'created',
        key: 'created',
        width: 150,
        sorter: (a, b) => {
          const aDate = a.created ? moment(a.created) : moment(0);
          const bDate = b.created ? moment(b.created) : moment(0);
          return aDate.valueOf() - bDate.valueOf();
        },
        render: (date) => {
          if (!date) return <span style={{ color: '#999' }}>Unknown</span>;
          return moment(date).format('YYYY-MM-DD HH:mm');
        },
      },
      lastUpdated: {
        title: 'Last Updated',
        dataIndex: 'lastUpdated',
        key: 'lastUpdated',
        width: 150,
        sorter: (a, b) => {
          const aDate = a.lastUpdated ? moment(a.lastUpdated) : moment(0);
          const bDate = b.lastUpdated ? moment(b.lastUpdated) : moment(0);
          return aDate.valueOf() - bDate.valueOf();
        },
        render: (date) => {
          if (!date) return <span style={{ color: '#999' }}>Unknown</span>;
          return moment(date).format('YYYY-MM-DD HH:mm');
        },
      },
      dueDate: {
        title: 'Due Date',
        dataIndex: 'dueDate',
        key: 'dueDate',
        width: 150,
        sorter: (a, b) => {
          const aDate = a.dueDate ? moment(a.dueDate) : moment(0);
          const bDate = b.dueDate ? moment(b.dueDate) : moment(0);
          return aDate.valueOf() - bDate.valueOf();
        },
        render: (date) => {
          if (!date) return <span style={{ color: '#999' }}>Not set</span>;
          const isOverdue = moment(date).isBefore(moment(), 'day');
          return (
            <Tag color={isOverdue ? 'red' : 'blue'}>
              {moment(date).format('YYYY-MM-DD')}
            </Tag>
          );
        },
      },
      estimatedDate: {
        title: 'Estimated Date',
        dataIndex: 'estimatedDate',
        key: 'estimatedDate',
        width: 150,
        render: (date) => {
          if (!date) return <span style={{ color: '#999' }}>Not set</span>;
          return moment(date).format('YYYY-MM-DD');
        },
      },
      completedDate: {
        title: 'Completed Date',
        dataIndex: 'completedDate',
        key: 'completedDate',
        width: 150,
        render: (date) => {
          if (!date) return <span style={{ color: '#999' }}>Not set</span>;
          return moment(date).format('YYYY-MM-DD');
        },
      },
      iteration: {
        title: 'Iteration',
        dataIndex: 'iterationId',
        key: 'iterationId',
        width: 120,
        render: (iterationId) => {
          const name = this.getIterationName(iterationId);
          return <Tag>{name}</Tag>;
        },
      },
      tags: {
        title: 'Tags',
        dataIndex: 'tags',
        key: 'tags',
        width: 200,
        render: (tags) => {
          if (!tags || tags.length === 0) {
            return <span style={{ color: '#999' }}>No tags</span>;
          }
          return (
            <Space size="small" wrap>
              {tags.map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </Space>
          );
        },
      },
      labels: {
        title: 'Labels',
        dataIndex: 'labels',
        key: 'labels',
        width: 200,
        render: (labels) => {
          if (!labels || labels.length === 0) {
            return <span style={{ color: '#999' }}>No labels</span>;
          }
          return (
            <Space size="small" wrap>
              {labels.map((label) => (
                <Tag key={label.id} color={label.color}>
                  {label.name}
                </Tag>
              ))}
            </Space>
          );
        },
      },
      sessions: {
        title: 'Sessions',
        dataIndex: 'sessionHistory',
        key: 'sessions',
        width: 100,
        render: (sessions) => {
          if (!sessions || sessions.length === 0) return '0';
          return <Badge count={sessions.length} />;
        },
      },
    };

    // Return only selected columns
    if (selectedColumns.includes('all')) {
      return Object.values(allColumns);
    }
    return selectedColumns.map((key) => allColumns[key]).filter(Boolean);
  };

  // Handle table change (sorting, filtering, pagination)
  handleTableChange = (pagination, filters, sorter) => {
    this.setState({
      pagination: {
        ...this.state.pagination,
        current: pagination.current,
        pageSize: pagination.pageSize,
      },
      sortedInfo: sorter,
    });
  };

  // Export functions
  exportToCSV = () => {
    const data = this.getTableData();
    const { selectedColumns } = this.state;
    const columns = this.getColumns();

    const headers = columns.map((col) => col.title);
    const rows = data.map((node) => {
      return columns.map((col) => {
        const value = node[col.dataIndex];
        if (col.dataIndex === 'timeSpent' || col.dataIndex === 'estimatedTime') {
          return formatTimeHuman(value || 0);
        }
        if (col.dataIndex === 'parent') {
          return this.getParentName(value);
        }
        if (col.dataIndex === 'isComplete') {
          return value ? 'Yes' : 'No';
        }
        if (moment.isMoment(value) || (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
          return moment(value).format('YYYY-MM-DD HH:mm');
        }
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return `"${(value || '').toString().replace(/"/g, '""')}"`;
      });
    });

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentProject}_table_${moment().format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    message.success('CSV exported successfully');
  };

  exportToJSON = () => {
    const data = this.getTableData();
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentProject}_table_${moment().format('YYYY-MM-DD')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    message.success('JSON exported successfully');
  };

  // Column selection
  handleColumnChange = (checkedValues) => {
    this.setState({ selectedColumns: checkedValues });
  };

  handlePresetChange = (preset) => {
    if (preset === 'full') {
      this.setState({ selectedColumns: ['all'] });
    } else {
      this.setState({ selectedColumns: this.columnPresets[preset] });
    }
    this.setState({ columnPreset: preset });
  };

  // View management
  saveCurrentView = () => {
    Modal.confirm({
      title: 'Save Current View',
      content: (
        <Input
          placeholder="View name"
          ref={(input) => {
            if (input) {
              setTimeout(() => input.focus(), 100);
            }
          }}
          onPressEnter={(e) => {
            const name = e.target.value;
            if (name) {
              const view = {
                name,
                filters: this.state.filters,
                selectedColumns: this.state.selectedColumns,
                pagination: this.state.pagination,
                sortedInfo: this.state.sortedInfo,
              };
              const savedViews = [...this.state.savedViews, view];
              localStorage.setItem('sheetViews', JSON.stringify(savedViews));
              this.setState({ savedViews, currentView: name });
              Modal.destroyAll();
              message.success('View saved successfully');
            }
          }}
        />
      ),
      onOk: () => {},
    });
  };

  loadView = (view) => {
    this.setState({
      filters: view.filters,
      selectedColumns: view.selectedColumns,
      pagination: view.pagination,
      sortedInfo: view.sortedInfo,
      currentView: view.name,
    });
    message.success(`Loaded view: ${view.name}`);
  };

  deleteView = (viewName) => {
    const savedViews = this.state.savedViews.filter((v) => v.name !== viewName);
    localStorage.setItem('sheetViews', JSON.stringify(savedViews));
    this.setState({ savedViews });
    if (this.state.currentView === viewName) {
      this.setState({ currentView: null });
    }
    message.success('View deleted');
  };

  // Node modal
  openNodeModal = (node) => {
    this.setState({
      nodeModalVisible: true,
      modalNodeId: node.id,
    });
  };

  closeNodeModal = () => {
    this.setState({
      nodeModalVisible: false,
      modalNodeId: null,
    });
    // Refresh data
    const newState = ipcRenderer.sendSync('api:initializeProjectState', this.projectName);
    this.setState(newState);
  };

  handleNodeModalOk = () => {
    this.closeNodeModal();
  };

  updateNodeProperty = (property, nodeId, value, shouldSync = true) => {
    NodeController.updateNodeProperty(property, nodeId, value, shouldSync);
    const newState = ipcRenderer.sendSync('api:initializeProjectState', this.projectName);
    this.setState(newState);
  };

  // Column selection modal
  showColumnSelectionModal = () => {
    const { selectedColumns } = this.state;
    const allColumnOptions = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'parent', label: 'Parent' },
      { key: 'status', label: 'Status' },
      { key: 'completion', label: 'Completion' },
      { key: 'timeSpent', label: 'Time Spent' },
      { key: 'estimatedTime', label: 'Estimated Time' },
      { key: 'created', label: 'Created' },
      { key: 'lastUpdated', label: 'Last Updated' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'estimatedDate', label: 'Estimated Date' },
      { key: 'completedDate', label: 'Completed Date' },
      { key: 'iteration', label: 'Iteration' },
      { key: 'tags', label: 'Tags' },
      { key: 'labels', label: 'Labels' },
      { key: 'sessions', label: 'Sessions' },
    ];

    let currentSelection = selectedColumns.includes('all') 
      ? allColumnOptions.map((o) => o.key) 
      : selectedColumns;

    Modal.confirm({
      title: 'Select Columns',
      width: 500,
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button size="small" onClick={() => this.handlePresetChange('overview')}>
                Overview
              </Button>
              <Button size="small" onClick={() => this.handlePresetChange('timeTracking')}>
                Time Tracking
              </Button>
              <Button size="small" onClick={() => this.handlePresetChange('planning')}>
                Planning
              </Button>
              <Button size="small" onClick={() => this.handlePresetChange('full')}>
                All Columns
              </Button>
            </Space>
          </div>
          <Checkbox.Group
            value={currentSelection}
            onChange={(values) => {
              currentSelection = values;
            }}
            style={{ width: '100%' }}
          >
            <Row>
              {allColumnOptions.map((option) => (
                <Col span={12} key={option.key} style={{ marginBottom: 8 }}>
                  <Checkbox value={option.key}>{option.label}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </div>
      ),
      onOk: () => {
        this.handleColumnChange(currentSelection);
        Modal.destroyAll();
      },
    });
  };

  // Views menu
  getViewsMenu = () => {
    const { savedViews } = this.state;
    const menuItems = [];
    
    if (savedViews.length === 0) {
      menuItems.push(
        <Menu.Item key="no-views" disabled>
          No saved views
        </Menu.Item>
      );
    } else {
      savedViews.forEach((view) => {
        menuItems.push(
          <Menu.Item key={view.name}>
            <Space>
              <Button 
                type="link" 
                onClick={(e) => {
                  e.stopPropagation();
                  this.loadView(view);
                }}
                style={{ padding: 0 }}
              >
                {view.name}
              </Button>
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  this.deleteView(view.name);
                }}
                style={{ padding: 0 }}
              />
            </Space>
          </Menu.Item>
        );
      });
    }
    
    menuItems.push(<Menu.Divider key="divider" />);
    menuItems.push(
      <Menu.Item key="save" icon={<SaveOutlined />} onClick={this.saveCurrentView}>
        Save Current View
      </Menu.Item>
    );
    
    return <Menu>{menuItems}</Menu>;
  };

  // Export menu
  getExportMenu = () => {
    return (
      <Menu>
        <Menu.Item 
          key="csv" 
          icon={<FileTextOutlined />} 
          onClick={(e) => {
            e.domEvent?.stopPropagation();
            this.exportToCSV();
          }}
        >
          Export to CSV
        </Menu.Item>
        <Menu.Item 
          key="json" 
          icon={<FileOutlined />} 
          onClick={(e) => {
            e.domEvent?.stopPropagation();
            this.exportToJSON();
          }}
        >
          Export to JSON
        </Menu.Item>
      </Menu>
    );
  };

  render() {
    const {
      lokiLoaded,
      searchText,
      filters,
      pagination,
      nodeModalVisible,
      modalNodeId,
      showStatistics,
      parents,
      iterations,
    } = this.state;

    if (!lokiLoaded) {
      return (
        <Layout>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h1>Loading...</h1>
          </div>
        </Layout>
      );
    }

    const data = this.getTableData();
    const columns = this.getColumns();
    const stats = this.calculateStatistics();
    const node = modalNodeId ? this.state.nodes[modalNodeId] : null;

    return (
      <Layout>
        <div className="sheet-page">
          <div className="sheet-header">
            <h1>{this.projectName}'s Table</h1>
            <Space>
              <Input
                placeholder="Search nodes..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => this.setState({ searchText: e.target.value, pagination: { ...pagination, current: 1 } })}
                style={{ width: 300 }}
                allowClear
              />
              <Select
                placeholder="Filter by Parent"
                value={filters.parent}
                onChange={(value) => this.setState({ filters: { ...filters, parent: value }, pagination: { ...pagination, current: 1 } })}
                allowClear
                style={{ width: 150 }}
              >
                {Object.values(parents || {}).map((parent) => (
                  <Option key={parent.id} value={parent.id}>
                    {parent.title}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Filter by Status"
                value={filters.status}
                onChange={(value) => this.setState({ filters: { ...filters, status: value }, pagination: { ...pagination, current: 1 } })}
                allowClear
                style={{ width: 150 }}
              >
                {this.state.nodeStates.map((state) => (
                  <Option key={state.name || state} value={state.name || state}>
                    {state.name || state}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Filter by Completion"
                value={filters.completion}
                onChange={(value) => this.setState({ filters: { ...filters, completion: value }, pagination: { ...pagination, current: 1 } })}
                allowClear
                style={{ width: 150 }}
              >
                <Option value="completed">Completed</Option>
                <Option value="incomplete">Incomplete</Option>
              </Select>
              <RangePicker
                placeholder={['Start Date', 'End Date']}
                onChange={(dates) => this.setState({ filters: { ...filters, dateRange: dates }, pagination: { ...pagination, current: 1 } })}
                style={{ width: 250 }}
              />
              <Select
                placeholder="Group By"
                value={this.state.groupBy}
                onChange={(value) => this.setState({ groupBy: value })}
                allowClear
                style={{ width: 150 }}
              >
                <Option value="parent">Parent</Option>
                <Option value="status">Status</Option>
                <Option value="completion">Completion</Option>
                <Option value="iteration">Iteration</Option>
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  const newState = ipcRenderer.sendSync('api:initializeProjectState', this.projectName);
                  this.setState(newState);
                  message.success('Data refreshed');
                }}
              >
                Refresh
              </Button>
              <Button icon={<SettingOutlined />} onClick={this.showColumnSelectionModal}>
                Columns
              </Button>
              <Dropdown overlay={this.getViewsMenu()} trigger={['click']}>
                <Button icon={<EyeOutlined />}>Views</Button>
              </Dropdown>
              <Dropdown overlay={this.getExportMenu()} trigger={['click']}>
                <Button icon={<DownloadOutlined />} type="primary">
                  Export
                </Button>
              </Dropdown>
            </Space>
          </div>

          {!showStatistics && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <Button
                icon={<BarChartOutlined />}
                onClick={() => this.setState({ showStatistics: true })}
                type="dashed"
              >
                Show Statistics & Visualizations
              </Button>
            </div>
          )}

          {showStatistics && (
            <Card className="statistics-panel" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={4}>
                  <Statistic title="Total Nodes" value={stats.total} />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Completed"
                    value={stats.completed}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Incomplete"
                    value={stats.incomplete}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Total Time"
                    value={formatTimeHuman(stats.totalTime)}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Avg Time"
                    value={formatTimeHuman(stats.avgTime)}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="Overdue"
                    value={stats.overdue}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
              </Row>
              <Divider />
              <Row gutter={16}>
                <Col span={12}>
                  <Card size="small" title="Completion Status">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '20px 0' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#3f8600' }}>
                          {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
                        </div>
                        <div style={{ color: '#666', marginTop: 8 }}>Completion Rate</div>
                      </div>
                      <div style={{ width: '2px', height: '60px', background: '#e8e8e8' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3f8600' }}>
                          {stats.completed}
                        </div>
                        <div style={{ color: '#666', marginTop: 4, fontSize: '12px' }}>Completed</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#cf1322', marginTop: 8 }}>
                          {stats.incomplete}
                        </div>
                        <div style={{ color: '#666', marginTop: 4, fontSize: '12px' }}>Incomplete</div>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="Time Distribution by Parent">
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {Object.values(parents || {}).map((parent) => {
                        const parentNodes = data.filter((n) => n.parent === parent.id);
                        const parentTime = parentNodes.reduce((sum, n) => sum + (n.timeSpent || 0), 0);
                        const percentage = stats.totalTime > 0 ? (parentTime / stats.totalTime) * 100 : 0;
                        return (
                          <div key={parent.id} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span>{parent.title}</span>
                              <span style={{ fontWeight: 'bold' }}>{formatTimeHuman(parentTime)}</span>
                            </div>
                            <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  background: '#1890ff',
                                  height: '100%',
                                  width: `${percentage}%`,
                                  transition: 'width 0.3s',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </Col>
              </Row>
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Button
                  icon={<BarChartOutlined />}
                  onClick={() => this.setState({ showStatistics: false })}
                  type="text"
                >
                  Hide Statistics
                </Button>
              </div>
            </Card>
          )}

          <Card>
            {this.state.groupBy ? (
              <div>
                {Object.entries(this.getGroupedData()).map(([groupName, groupData]) => (
                  <div key={groupName} style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16, padding: '8px 16px', background: '#f5f5f5', borderRadius: '4px' }}>
                      {groupName} ({groupData.length})
                    </h3>
                    <Table
                      columns={columns}
                      dataSource={groupData}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                      size="small"
                      onRow={(record) => ({
                        onClick: () => this.openNodeModal(record),
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                pagination={pagination}
                onChange={this.handleTableChange}
                scroll={{ x: 'max-content', y: 'calc(100vh - 400px)' }}
                size="small"
                onRow={(record) => ({
                  onClick: () => this.openNodeModal(record),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>

          {node && (
            <NodeModal
              node={node}
              parents={parents}
              iterations={iterations}
              visible={nodeModalVisible}
              handleCancel={this.closeNodeModal}
              handleOk={this.handleNodeModalOk}
              updateNodeProperty={this.updateNodeProperty}
              isTimerRunning={false}
            />
          )}
        </div>
      </Layout>
    );
  }
}

export default SheetPage;
