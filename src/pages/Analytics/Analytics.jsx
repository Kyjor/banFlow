// Libs
import React, { Component } from 'react';
import {
  Card,
  Spin,
  Space,
  Button,
  DatePicker,
  Select,
  Typography,
  Radio,
  Input,
  InputNumber,
  Badge,
  Table,
  Row,
  Col,
  Dropdown,
  Menu,
  message,
} from 'antd';
import {
  FilterOutlined,
  UpOutlined,
  DownOutlined,
  DownloadOutlined,
  FileOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import moment from 'moment';
// Layout
import Layout from '../../layouts/App';
// Reuse components
import StatisticsCards from '../Dashboard/components/StatisticsCards/StatisticsCards';
import TimeTrendChart from '../Dashboard/components/TimeCharts/TimeTrendChart';
import TimeDistributionChart from '../Dashboard/components/TimeCharts/TimeDistributionChart';
import ActivityHeatmap from '../Dashboard/components/TimeCharts/ActivityHeatmap';
import ProjectSelector from '../Dashboard/components/ProjectSelector/ProjectSelector';
// Utils
import {
  loadMultipleProjectsData,
  getAllProjectNames,
} from '../Dashboard/utils/projectDataLoader';
import { aggregateProjectStats } from '../Dashboard/utils/aggregateCalculations';
import {
  formatTimeHuman,
  calculateTimeByParent,
  calculateTimeByTag,
  calculateTimeByIteration,
  calculateAverageSessionDuration,
} from '../Dashboard/utils/statisticsCalculations';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

class Analytics extends Component {
  static evaluateRule(node, rule) {
    if (!rule || !rule.field) return true;
    const { value } = rule;
    const lc = (text) => (text || '').toString().toLowerCase();

    switch (rule.field) {
      case 'titleDescription':
        return (
          lc(node.title).includes(lc(value)) ||
          lc(node.description).includes(lc(value))
        );
      case 'status':
        return value ? node.nodeState === value : true;
      case 'parent':
        return value ? node.parent === value : true;
      case 'tags':
        if (!value || value.length === 0) return true;
        return (
          Array.isArray(node.tags) && node.tags.some((t) => value.includes(t))
        );
      case 'labels':
        if (!value || value.length === 0) return true;
        return (
          Array.isArray(node.labels) &&
          node.labels.some((l) => value.includes(l))
        );
      case 'completion': {
        if (value === undefined || value === null || value === '') return true;
        const boolVal = value === 'complete';
        return !!node.isComplete === boolVal;
      }
      case 'iteration': {
        if (!value && value !== 0) return true;
        return node.iterationId === value;
      }
      case 'dueDate': {
        if (!value || value.length === 0) return true;
        const [start, end] = value;
        const due = node.dueDate ? new Date(node.dueDate) : null;
        if (!due) return false;
        if (start && due < new Date(start)) return false;
        if (end && due > new Date(end)) return false;
        return true;
      }
      case 'created': {
        if (!value || value.length === 0) return true;
        const [start, end] = value;
        const created = node.created ? new Date(node.created) : null;
        if (!created) return false;
        if (start && created < new Date(start)) return false;
        if (end && created > new Date(end)) return false;
        return true;
      }
      case 'updated': {
        if (!value || value.length === 0) return true;
        const [start, end] = value;
        const updated = node.lastUpdated ? new Date(node.lastUpdated) : null;
        if (!updated) return false;
        if (start && updated < new Date(start)) return false;
        if (end && updated > new Date(end)) return false;
        return true;
      }
      case 'estimatedTime': {
        if (!value) return true;
        const min = value.min ?? null;
        const max = value.max ?? null;
        const num = node.estimatedTime ?? 0;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
      }
      case 'timeSpent': {
        if (!value) return true;
        const min = value.min ?? null;
        const max = value.max ?? null;
        const num = node.timeSpent ?? 0;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
      }
      default:
        return true;
    }
  }

  static formatDurationWithDays(seconds) {
    if (!seconds || seconds <= 0) return '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      const parts = [`${days}d`];
      if (hours > 0) parts.push(`${hours}h`);
      else if (minutes > 0) parts.push(`${minutes}m`);
      return parts.join(' ');
    }
    return formatTimeHuman(seconds);
  }

  constructor(props) {
    super(props);

    const savedSelectedProjects = localStorage.getItem(
      'analyticsSelectedProjects',
    );
    const initialSelectedProjects = savedSelectedProjects
      ? JSON.parse(savedSelectedProjects)
      : [];
    const savedReports = localStorage.getItem('analyticsSavedReports');

    this.state = {
      availableProjects: [],
      selectedProjects: initialSelectedProjects,
      projectsData: [],
      isLoadingProjects: false,
      dateRange: null,
      selectedTag: null,
      selectedIteration: null,
      filterRules: [],
      queryConjunction: 'AND',
      filtersOpen: true,
      trendPeriod: 'week',
      savedReports: savedReports ? JSON.parse(savedReports) : [],
    };
  }

  componentDidMount() {
    this.loadAvailableProjects();
    // Default to all projects
    const availableProjects = getAllProjectNames();
    this.setState(
      { availableProjects, selectedProjects: availableProjects },
      () => {
        if (availableProjects.length > 0) {
          this.loadProjectsData(availableProjects);
        }
      },
    );
  }

  loadAvailableProjects = () => {
    const availableProjects = getAllProjectNames();
    this.setState({ availableProjects });
  };

  loadProjectsData = async (projectNames) => {
    if (!projectNames || projectNames.length === 0) {
      this.setState({ projectsData: [] });
      return;
    }

    this.setState({ isLoadingProjects: true });
    try {
      const projectsData = await loadMultipleProjectsData(projectNames);
      this.setState({ projectsData });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading projects data:', error);
    } finally {
      this.setState({ isLoadingProjects: false });
    }
  };

  // Removed project selection - always uses all projects

  addFilterRule = () => {
    const { filterRules } = this.state;
    const newRule = {
      id: Date.now(),
      field: 'titleDescription',
      value: '',
    };
    this.setState({ filterRules: [...filterRules, newRule] });
  };

  updateFilterRule = (id, updates) => {
    const { filterRules } = this.state;
    const next = filterRules.map((rule) =>
      rule.id === id ? { ...rule, ...updates } : rule,
    );
    this.setState({ filterRules: next });
  };

  removeFilterRule = (id) => {
    const { filterRules } = this.state;
    this.setState({ filterRules: filterRules.filter((r) => r.id !== id) });
  };

  filterNodes = (nodes) => {
    const { filterRules, queryConjunction } = this.state;
    if (!filterRules || filterRules.length === 0) return nodes;

    return nodes.filter((node) => {
      if (queryConjunction === 'OR') {
        return filterRules.some((rule) => this.evaluateRule(node, rule));
      }
      return filterRules.every((rule) => this.evaluateRule(node, rule));
    });
  };

  getFilteredProjects = () => {
    const { projectsData, dateRange, selectedTag, selectedIteration } =
      this.state;
    if (!projectsData || projectsData.length === 0) return [];

    let filteredData = projectsData;

    // Date range filter (sessions)
    if (dateRange && dateRange[0] && dateRange[1]) {
      filteredData = filteredData.map((project) => {
        const filteredNodes = project.nodes.filter((node) => {
          const sessions = node.sessionHistory || [];
          return sessions.some((session) => {
            if (!session.startDateTime) return false;
            const sessionDate = moment(session.startDateTime);
            return sessionDate.isBetween(
              dateRange[0],
              dateRange[1],
              'day',
              '[]',
            );
          });
        });
        return { ...project, nodes: filteredNodes };
      });
    }

    // Tag filter
    if (selectedTag) {
      filteredData = filteredData.map((project) => {
        const filteredNodes = project.nodes.filter((node) => {
          const tags = node.tags || [];
          return tags.includes(selectedTag);
        });
        return { ...project, nodes: filteredNodes };
      });
    }

    // Iteration filter
    if (selectedIteration) {
      filteredData = filteredData.map((project) => {
        const filteredNodes = project.nodes.filter((node) => {
          const iterationId = node.iterationId || node.iteration;
          return iterationId === selectedIteration;
        });
        return { ...project, nodes: filteredNodes };
      });
    }

    // Query builder rules
    filteredData = filteredData.map((project) => ({
      ...project,
      nodes: this.filterNodes(project.nodes || []),
    }));

    return filteredData;
  };

  getTrendData = () => {
    const { trendPeriod } = this.state;
    const filteredProjects = this.getFilteredProjects();
    if (!filteredProjects || filteredProjects.length === 0) return [];

    let daysToShow = 7;
    let dateFormat = 'MMM D';

    if (trendPeriod === 'month') {
      daysToShow = 30;
      dateFormat = 'MMM D';
    } else if (trendPeriod === 'quarter') {
      daysToShow = 90;
      dateFormat = 'MMM D';
    }

    const days = [];
    const now = moment();

    for (let i = daysToShow - 1; i >= 0; i -= 1) {
      const date = moment(now).subtract(i, 'days');
      const dateStr = date.format('YYYY-MM-DD');
      let totalTime = 0;

      filteredProjects.forEach((project) => {
        (project.nodes || []).forEach((node) => {
          const sessions = node.sessionHistory || [];
          sessions.forEach((session) => {
            if (session.startDateTime) {
              const sessionDate = moment(session.startDateTime);
              if (sessionDate.format('YYYY-MM-DD') === dateStr) {
                totalTime += session.length || 0;
              }
            }
          });
        });
      });

      days.push({
        label: date.format(dateFormat),
        value: Math.round(totalTime),
        date: dateStr,
      });
    }
    return days;
  };

  getHeatmapData = () => {
    const filteredProjects = this.getFilteredProjects();
    const data = {};
    const today = moment();

    for (let i = 29; i >= 0; i -= 1) {
      const date = today.clone().subtract(i, 'days');
      const dateStr = date.format('YYYY-MM-DD');
      let totalTime = 0;

      filteredProjects.forEach((project) => {
        (project.nodes || []).forEach((node) => {
          const sessions = node.sessionHistory || [];
          sessions.forEach((session) => {
            if (session.startDateTime) {
              const sessionDate = moment(session.startDateTime);
              if (sessionDate.format('YYYY-MM-DD') === dateStr) {
                totalTime += session.length || 0;
              }
            }
          });
        });
      });

      data[dateStr] = totalTime;
    }
    return data;
  };

  getDistributionData = (type = 'parent') => {
    const filteredProjects = this.getFilteredProjects();
    const allNodes = filteredProjects.flatMap((p) => p.nodes || []);
    const allParents = filteredProjects.flatMap((p) => p.parents || []);
    const allIterations = filteredProjects.flatMap((p) => p.iterations || []);

    if (type === 'parent') {
      return calculateTimeByParent(allNodes, allParents);
    }
    if (type === 'tag') {
      return calculateTimeByTag(allNodes);
    }
    if (type === 'iteration') {
      return calculateTimeByIteration(allNodes, allIterations);
    }
    return {};
  };

  saveCurrentReport = () => {
    const {
      selectedProjects,
      dateRange,
      selectedTag,
      selectedIteration,
      filterRules,
      queryConjunction,
      trendPeriod,
    } = this.state;
    const name = window.prompt('Save report as:');
    if (!name) return;

    const report = {
      name,
      createdAt: new Date().toISOString(),
      state: {
        selectedProjects,
        dateRange: dateRange
          ? [dateRange[0]?.toISOString(), dateRange[1]?.toISOString()]
          : null,
        selectedTag,
        selectedIteration,
        filterRules,
        queryConjunction,
        trendPeriod,
      },
    };

    this.setState((prev) => {
      const withoutExisting = prev.savedReports.filter((r) => r.name !== name);
      const updatedReports = [...withoutExisting, report];
      localStorage.setItem(
        'analyticsSavedReports',
        JSON.stringify(updatedReports),
      );
      message.success('Report saved');
      return { savedReports: updatedReports };
    });
  };

  loadReport = (report) => {
    if (!report || !report.state) return;
    const { state } = report;
    const dateRange =
      state.dateRange &&
      state.dateRange.length === 2 &&
      state.dateRange[0] &&
      state.dateRange[1]
        ? [moment(state.dateRange[0]), moment(state.dateRange[1])]
        : null;

    this.setState(
      {
        selectedProjects: state.selectedProjects || [],
        dateRange,
        selectedTag: state.selectedTag || null,
        selectedIteration: state.selectedIteration || null,
        filterRules: state.filterRules || [],
        queryConjunction: state.queryConjunction || 'AND',
        trendPeriod: state.trendPeriod || 'week',
      },
      () => {
        this.loadProjectsData(state.selectedProjects);
        message.success(`Loaded report: ${report.name}`);
      },
    );
  };

  deleteReport = (name) => {
    this.setState((prev) => {
      const updatedReports = prev.savedReports.filter((r) => r.name !== name);
      localStorage.setItem(
        'analyticsSavedReports',
        JSON.stringify(updatedReports),
      );
      message.success('Report deleted');
      return { savedReports: updatedReports };
    });
  };

  getSavedReportsMenu = () => {
    const { savedReports } = this.state;
    return (
      <Menu>
        {savedReports.length === 0 && (
          <Menu.Item disabled key="empty">
            No saved reports
          </Menu.Item>
        )}
        {savedReports.map((report) => (
          <Menu.Item key={report.name} onClick={() => this.loadReport(report)}>
            {report.name}
            <Button
              size="small"
              type="text"
              danger
              style={{ float: 'right' }}
              onClick={(e) => {
                e.domEvent?.stopPropagation?.();
                this.deleteReport(report.name);
              }}
            >
              Delete
            </Button>
          </Menu.Item>
        ))}
      </Menu>
    );
  };

  getForecasting = () => {
    const completion = this.getCompletionAnalytics();
    const trend = this.getTrendData();
    const remaining = completion.totalIncomplete || 0;

    // Average completions per day (last 14 days)
    const completionByDate = completion.completionByDate || {};
    const last14 = Object.entries(completionByDate)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .slice(0, 14);
    const totalCompletedLast14 = last14.reduce(
      (sum, [, count]) => sum + count,
      0,
    );
    const daysConsidered = last14.length || 1;
    const avgCompletionsPerDay = totalCompletedLast14 / daysConsidered;

    const daysToFinish =
      avgCompletionsPerDay > 0
        ? Math.ceil(remaining / avgCompletionsPerDay)
        : null;
    const estimatedFinishDate =
      daysToFinish !== null
        ? moment().add(daysToFinish, 'days').format('YYYY-MM-DD')
        : 'N/A';

    // Time forecast from trend (last 14 days)
    const recentTrend = trend.slice(-14);
    const avgTimePerDay =
      recentTrend.length > 0
        ? recentTrend.reduce((sum, d) => sum + (d.value || 0), 0) /
          recentTrend.length
        : 0;
    const projectedNextWeekTime = Math.round(avgTimePerDay * 7);

    return {
      remaining,
      avgCompletionsPerDay: avgCompletionsPerDay.toFixed(2),
      daysToFinish,
      estimatedFinishDate,
      projectedNextWeekTime,
    };
  };

  getSessionAnalytics = () => {
    const filteredProjects = this.getFilteredProjects();
    const allNodes = filteredProjects.flatMap((p) => p.nodes || []);

    const sessions = [];
    allNodes.forEach((node) => {
      (node.sessionHistory || []).forEach((session) => {
        if (session.startDateTime && session.length) {
          sessions.push({
            ...session,
            nodeTitle: node.title,
            nodeId: node.id,
          });
        }
      });
    });

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageDuration: 0,
        longestSession: 0,
        shortestSession: 0,
        totalTime: 0,
        sessionsByDay: {},
        sessionsByHour: {},
      };
    }

    const durations = sessions.map((s) => s.length).filter(Boolean);
    const sessionsByDay = {};
    const sessionsByHour = {};

    sessions.forEach((session) => {
      if (session.startDateTime) {
        const date = moment(session.startDateTime);
        const dayKey = date.format('YYYY-MM-DD');
        const hour = date.hour();

        sessionsByDay[dayKey] = (sessionsByDay[dayKey] || 0) + 1;
        sessionsByHour[hour] = (sessionsByHour[hour] || 0) + 1;
      }
    });

    return {
      totalSessions: sessions.length,
      averageDuration: calculateAverageSessionDuration(allNodes),
      longestSession: Math.max(...durations, 0),
      shortestSession: Math.min(...durations, 0),
      totalTime: durations.reduce((sum, d) => sum + d, 0),
      sessionsByDay,
      sessionsByHour,
    };
  };

  getCompletionAnalytics = () => {
    const filteredProjects = this.getFilteredProjects();
    const allNodes = filteredProjects.flatMap((p) => p.nodes || []);

    const completed = allNodes.filter((n) => n.isComplete);
    const incomplete = allNodes.filter((n) => !n.isComplete);

    // Calculate average time to completion
    const completionTimes = completed
      .filter((n) => n.created && n.completedDate)
      .map((n) => {
        const created = moment(n.created);
        const completedDate = moment(n.completedDate);
        return completedDate.diff(created, 'seconds');
      });

    const avgTimeToCompletion =
      completionTimes.length > 0
        ? Math.round(
            completionTimes.reduce((sum, t) => sum + t, 0) /
              completionTimes.length,
          )
        : 0;

    // Completion by date
    const completionByDate = {};
    completed.forEach((node) => {
      if (node.completedDate) {
        const date = moment(node.completedDate).format('YYYY-MM-DD');
        completionByDate[date] = (completionByDate[date] || 0) + 1;
      }
    });

    return {
      totalCompleted: completed.length,
      totalIncomplete: incomplete.length,
      completionRate:
        allNodes.length > 0
          ? Math.round((completed.length / allNodes.length) * 100)
          : 0,
      avgTimeToCompletion,
      completionByDate,
    };
  };

  getProductivityMetrics = () => {
    const filteredProjects = this.getFilteredProjects();
    const allNodes = filteredProjects.flatMap((p) => p.nodes || []);
    const sessionStats = this.getSessionAnalytics();

    // Calculate tasks completed per hour
    const totalTimeHours = sessionStats.totalTime / 3600;
    const tasksPerHour =
      totalTimeHours > 0
        ? (
            this.getCompletionAnalytics().totalCompleted / totalTimeHours
          ).toFixed(2)
        : 0;

    // Calculate focus time (sessions > 30 minutes)
    const focusSessions = allNodes
      .flatMap((n) => n.sessionHistory || [])
      .filter((s) => s.length && s.length >= 1800).length; // 30 minutes = 1800 seconds

    // Work patterns - most active days
    const sessionsByDay = sessionStats.sessionsByDay || {};
    const mostActiveDay =
      Object.entries(sessionsByDay).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      'N/A';

    // Most active hour
    const sessionsByHour = sessionStats.sessionsByHour || {};
    const mostActiveHour =
      Object.entries(sessionsByHour).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      null;

    return {
      tasksPerHour: parseFloat(tasksPerHour),
      focusSessions,
      mostActiveDay,
      mostActiveHour: mostActiveHour !== null ? `${mostActiveHour}:00` : 'N/A',
      totalFocusTime: focusSessions * 1800, // Approximate
    };
  };

  getProjectComparison = () => {
    const filteredProjects = this.getFilteredProjects();
    if (filteredProjects.length === 0) return [];

    return filteredProjects
      .map((project) => {
        const nodes = project.nodes || [];
        const completed = nodes.filter((n) => n.isComplete).length;
        const totalTime = nodes.reduce((sum, n) => sum + (n.timeSpent || 0), 0);
        const completionRate =
          nodes.length > 0 ? Math.round((completed / nodes.length) * 100) : 0;

        return {
          projectName: project.projectName,
          totalNodes: nodes.length,
          completed,
          incomplete: nodes.length - completed,
          completionRate,
          totalTimeSpent: totalTime,
          avgTimePerNode:
            nodes.length > 0 ? Math.round(totalTime / nodes.length) : 0,
        };
      })
      .sort((a, b) => b.totalTimeSpent - a.totalTimeSpent);
  };

  exportToCSV = () => {
    const filteredProjects = this.getFilteredProjects();
    const allNodes = filteredProjects.flatMap((p) => p.nodes || []);

    if (allNodes.length === 0) {
      message.warning('No data to export');
      return;
    }

    const headers = [
      'Title',
      'Description',
      'Parent',
      'Status',
      'Completion',
      'Time Spent',
      'Estimated Time',
      'Created',
      'Updated',
      'Due Date',
      'Tags',
      'Labels',
    ];
    const rows = allNodes.map((node) => {
      const parent = filteredProjects
        .flatMap((p) => p.parents || [])
        .find((p) => p.id === node.parent);

      return [
        node.title || '',
        node.description || '',
        parent?.title || '',
        node.nodeState || '',
        node.isComplete ? 'Complete' : 'Incomplete',
        formatTimeHuman(node.timeSpent || 0),
        formatTimeHuman(node.estimatedTime || 0),
        node.created ? moment(node.created).format('YYYY-MM-DD HH:mm') : '',
        node.lastUpdated
          ? moment(node.lastUpdated).format('YYYY-MM-DD HH:mm')
          : '',
        node.dueDate ? moment(node.dueDate).format('YYYY-MM-DD') : '',
        (node.tags || []).join('; '),
        (node.labels || [])
          .map((l) => (typeof l === 'string' ? l : l?.name || l?.id || ''))
          .join('; '),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_export_${moment().format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    message.success('CSV exported successfully');
  };

  exportToJSON = () => {
    const filteredProjects = this.getFilteredProjects();
    const aggregateStats = aggregateProjectStats(filteredProjects);
    const sessionStats = this.getSessionAnalytics();
    const completionStats = this.getCompletionAnalytics();
    const productivity = this.getProductivityMetrics();
    const comparison = this.getProjectComparison();

    const {
      selectedProjects,
      dateRange,
      selectedTag,
      selectedIteration,
      filterRules,
    } = this.state;

    const exportData = {
      exportDate: moment().toISOString(),
      selectedProjects,
      filters: {
        dateRange: dateRange
          ? [dateRange[0]?.toISOString(), dateRange[1]?.toISOString()]
          : null,
        tag: selectedTag,
        iteration: selectedIteration,
        queryRules: filterRules,
      },
      statistics: {
        aggregate: aggregateStats,
        sessions: sessionStats,
        completion: completionStats,
        productivity,
      },
      projectComparison: comparison,
      trendData: this.getTrendData(),
      distributionData: {
        parent: this.getDistributionData('parent'),
        tag: this.getDistributionData('tag'),
        iteration: this.getDistributionData('iteration'),
      },
      heatmapData: this.getHeatmapData(),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_export_${moment().format('YYYY-MM-DD')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    message.success('JSON exported successfully');
  };

  getExportMenu = () => (
    <Menu>
      <Menu.Item
        key="csv"
        icon={<FileExcelOutlined />}
        onClick={() => this.exportToCSV()}
      >
        Export to CSV
      </Menu.Item>
      <Menu.Item
        key="json"
        icon={<FileOutlined />}
        onClick={() => this.exportToJSON()}
      >
        Export to JSON
      </Menu.Item>
    </Menu>
  );

  render() {
    const {
      availableProjects,
      selectedProjects,
      isLoadingProjects,
      dateRange,
      selectedTag,
      selectedIteration,
      projectsData,
      filterRules,
      filtersOpen,
      queryConjunction,
      trendPeriod,
    } = this.state;

    const filteredProjects = this.getFilteredProjects();
    const aggregateStats = aggregateProjectStats(filteredProjects);

    return (
      <Layout>
        <Card
          style={{
            margin: '16px',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          bodyStyle={{ padding: '16px' }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  Analytics
                </Title>
                <Text type="secondary">
                  Analyze across one, many, or all projects with customizable
                  filters.
                </Text>
              </div>
              <Space>
                <ProjectSelector
                  availableProjects={availableProjects}
                  selectedProjects={selectedProjects}
                  onSelectionChange={this.handleProjectSelectionChange}
                  onSelectAll={this.handleSelectAll}
                  onDeselectAll={this.handleDeselectAll}
                />
                <Space>
                  <Dropdown
                    overlay={this.getSavedReportsMenu()}
                    trigger={['click']}
                  >
                    <Button>Reports</Button>
                  </Dropdown>
                  <Button type="dashed" onClick={this.saveCurrentReport}>
                    Save Report
                  </Button>
                  <Dropdown overlay={this.getExportMenu()} trigger={['click']}>
                    <Button icon={<DownloadOutlined />}>Export</Button>
                  </Dropdown>
                </Space>
              </Space>
            </div>

            <Card
              style={{
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e8e8e8',
              }}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '12px',
                }}
              >
                <RangePicker
                  value={dateRange}
                  onChange={(val) => this.setState({ dateRange: val })}
                  allowClear
                  placeholder={['Session Start Date', 'Session End Date']}
                />
                <Select
                  allowClear
                  placeholder="Tag"
                  style={{ minWidth: 140 }}
                  value={selectedTag}
                  onChange={(val) => this.setState({ selectedTag: val })}
                  options={(() => {
                    const tags = new Set();
                    projectsData.forEach((p) =>
                      (p.nodes || []).forEach((n) =>
                        (n.tags || []).forEach((t) => tags.add(t)),
                      ),
                    );
                    return Array.from(tags).map((t) => ({
                      label: t,
                      value: t,
                    }));
                  })()}
                />
                <Select
                  allowClear
                  placeholder="Iteration"
                  style={{ minWidth: 140 }}
                  value={selectedIteration}
                  onChange={(val) => this.setState({ selectedIteration: val })}
                  options={(() => {
                    const iterations = new Set();
                    projectsData.forEach((p) =>
                      (p.iterations || []).forEach((it) =>
                        iterations.add(it.id),
                      ),
                    );
                    return Array.from(iterations).map((it) => ({
                      label: it,
                      value: it,
                    }));
                  })()}
                />
                <Badge
                  count={filterRules.length}
                  showZero={false}
                  offset={[8, 0]}
                >
                  <Button
                    icon={filtersOpen ? <UpOutlined /> : <DownOutlined />}
                    onClick={() =>
                      this.setState((prev) => ({
                        filtersOpen: !prev.filtersOpen,
                      }))
                    }
                    type={filtersOpen ? 'default' : 'text'}
                  >
                    <FilterOutlined /> Query Builder
                  </Button>
                </Badge>
                <Button
                  onClick={() =>
                    this.setState({
                      dateRange: null,
                      selectedTag: null,
                      selectedIteration: null,
                      filterRules: [],
                    })
                  }
                >
                  Clear All
                </Button>
              </div>
              {filtersOpen && (
                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #f0f0f0',
                  }}
                >
                  <div
                    style={{
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        color: '#666',
                        fontWeight: 500,
                      }}
                    >
                      Match:
                    </span>
                    <Radio.Group
                      value={queryConjunction}
                      onChange={(e) =>
                        this.setState({ queryConjunction: e.target.value })
                      }
                      optionType="button"
                      buttonStyle="solid"
                      size="small"
                    >
                      <Radio.Button value="AND">All rules (AND)</Radio.Button>
                      <Radio.Button value="OR">Any rule (OR)</Radio.Button>
                    </Radio.Group>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    {filterRules.map((rule) => {
                      const { field } = rule;
                      const renderValueInput = () => {
                        if (field === 'status') {
                          const statuses = Array.from(
                            new Set(
                              filteredProjects.flatMap((p) =>
                                (p.nodes || [])
                                  .map((n) => n?.nodeState)
                                  .filter(Boolean),
                              ),
                            ),
                          );
                          return (
                            <Select
                              style={{ width: '100%' }}
                              size="small"
                              placeholder="Select status"
                              value={rule.value}
                              onChange={(val) =>
                                this.updateFilterRule(rule.id, { value: val })
                              }
                              allowClear
                            >
                              {statuses.map((s) => (
                                <Select.Option key={s} value={s}>
                                  {s}
                                </Select.Option>
                              ))}
                            </Select>
                          );
                        }
                        if (field === 'parent') {
                          const parentIds = new Set();
                          filteredProjects.forEach((p) => {
                            (p.parents || []).forEach((parent) =>
                              parentIds.add(parent.id),
                            );
                          });
                          return (
                            <Select
                              style={{ width: '100%' }}
                              size="small"
                              placeholder="Select parent"
                              value={rule.value}
                              onChange={(val) =>
                                this.updateFilterRule(rule.id, { value: val })
                              }
                              allowClear
                              showSearch
                              optionFilterProp="children"
                            >
                              {Array.from(parentIds).map((pid) => {
                                const parent = filteredProjects
                                  .flatMap((p) => p.parents || [])
                                  .find((p) => p.id === pid);
                                return (
                                  <Select.Option key={pid} value={pid}>
                                    {parent?.title || pid}
                                  </Select.Option>
                                );
                              })}
                            </Select>
                          );
                        }
                        if (field === 'tags') {
                          const tags = Array.from(
                            new Set(
                              filteredProjects.flatMap((p) =>
                                (p.nodes || [])
                                  .flatMap((n) =>
                                    Array.isArray(n?.tags) ? n.tags : [],
                                  )
                                  .filter(Boolean),
                              ),
                            ),
                          );
                          return (
                            <Select
                              style={{ width: '100%' }}
                              size="small"
                              mode="multiple"
                              placeholder="Select tags"
                              value={rule.value}
                              onChange={(val) =>
                                this.updateFilterRule(rule.id, { value: val })
                              }
                              allowClear
                            >
                              {tags.map((t) => (
                                <Select.Option key={t} value={t}>
                                  {t}
                                </Select.Option>
                              ))}
                            </Select>
                          );
                        }
                        if (field === 'labels') {
                          const labels = Array.from(
                            new Set(
                              filteredProjects.flatMap((p) =>
                                (p.nodes || [])
                                  .flatMap((n) =>
                                    Array.isArray(n?.labels) ? n.labels : [],
                                  )
                                  .map((l) =>
                                    typeof l === 'string'
                                      ? l
                                      : l?.name || l?.id,
                                  )
                                  .filter(Boolean),
                              ),
                            ),
                          );
                          return (
                            <Select
                              style={{ width: '100%' }}
                              size="small"
                              mode="multiple"
                              placeholder="Select labels"
                              value={rule.value}
                              onChange={(val) =>
                                this.updateFilterRule(rule.id, { value: val })
                              }
                              allowClear
                            >
                              {labels.map((l) => (
                                <Select.Option key={l} value={l}>
                                  {l}
                                </Select.Option>
                              ))}
                            </Select>
                          );
                        }
                        if (
                          field === 'dueDate' ||
                          field === 'created' ||
                          field === 'updated'
                        ) {
                          return (
                            <RangePicker
                              style={{ width: '100%' }}
                              size="small"
                              onChange={(dates) =>
                                this.updateFilterRule(rule.id, {
                                  value: dates
                                    ? dates.map((d) =>
                                        d ? d.toISOString() : null,
                                      )
                                    : [],
                                })
                              }
                              value={
                                rule.value && rule.value.length === 2
                                  ? [
                                      moment(rule.value[0]),
                                      moment(rule.value[1]),
                                    ]
                                  : null
                              }
                            />
                          );
                        }
                        if (
                          field === 'estimatedTime' ||
                          field === 'timeSpent'
                        ) {
                          return (
                            <Space size={4} style={{ width: '100%' }}>
                              <InputNumber
                                style={{ width: '100%' }}
                                size="small"
                                placeholder="Min (seconds)"
                                value={rule.value?.min}
                                onChange={(val) =>
                                  this.updateFilterRule(rule.id, {
                                    value: { ...(rule.value || {}), min: val },
                                  })
                                }
                              />
                              <InputNumber
                                style={{ width: '100%' }}
                                size="small"
                                placeholder="Max (seconds)"
                                value={rule.value?.max}
                                onChange={(val) =>
                                  this.updateFilterRule(rule.id, {
                                    value: { ...(rule.value || {}), max: val },
                                  })
                                }
                              />
                            </Space>
                          );
                        }
                        if (field === 'completion') {
                          return (
                            <Select
                              style={{ width: '100%' }}
                              size="small"
                              placeholder="Completion"
                              value={rule.value}
                              onChange={(val) =>
                                this.updateFilterRule(rule.id, { value: val })
                              }
                              allowClear
                            >
                              <Select.Option value="complete">
                                Complete
                              </Select.Option>
                              <Select.Option value="incomplete">
                                Incomplete
                              </Select.Option>
                            </Select>
                          );
                        }
                        if (field === 'iteration') {
                          const iterationOptions = filteredProjects.flatMap(
                            (p) =>
                              (p.iterations || []).map((iter) => ({
                                id: iter.id,
                                name: iter.title || `Iteration ${iter.id}`,
                              })),
                          );
                          return (
                            <Select
                              style={{ width: '100%' }}
                              size="small"
                              placeholder="Select iteration"
                              value={rule.value}
                              onChange={(val) =>
                                this.updateFilterRule(rule.id, { value: val })
                              }
                              allowClear
                            >
                              <Select.Option value={0}>Backlog</Select.Option>
                              {iterationOptions.map((it) => (
                                <Select.Option key={it.id} value={it.id}>
                                  {it.name}
                                </Select.Option>
                              ))}
                            </Select>
                          );
                        }
                        return (
                          <Input
                            style={{ width: '100%' }}
                            size="small"
                            placeholder="Contains text"
                            value={rule.value}
                            onChange={(e) =>
                              this.updateFilterRule(rule.id, {
                                value: e.target.value,
                              })
                            }
                          />
                        );
                      };

                      return (
                        <div
                          key={rule.id}
                          style={{
                            display: 'flex',
                            gap: '8px',
                            marginBottom: '8px',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                          }}
                        >
                          <Select
                            style={{ width: '180px' }}
                            size="small"
                            value={rule.field}
                            onChange={(val) =>
                              this.updateFilterRule(rule.id, {
                                field: val,
                                value: undefined,
                              })
                            }
                          >
                            <Select.Option value="titleDescription">
                              Title / Description
                            </Select.Option>
                            <Select.Option value="status">
                              Status / State
                            </Select.Option>
                            <Select.Option value="parent">Parent</Select.Option>
                            <Select.Option value="tags">Tags</Select.Option>
                            <Select.Option value="labels">Labels</Select.Option>
                            <Select.Option value="dueDate">
                              Due Date
                            </Select.Option>
                            <Select.Option value="created">
                              Created Date
                            </Select.Option>
                            <Select.Option value="updated">
                              Updated Date
                            </Select.Option>
                            <Select.Option value="estimatedTime">
                              Estimated Time (sec)
                            </Select.Option>
                            <Select.Option value="timeSpent">
                              Time Spent (sec)
                            </Select.Option>
                            <Select.Option value="completion">
                              Completion
                            </Select.Option>
                            <Select.Option value="iteration">
                              Iteration
                            </Select.Option>
                          </Select>
                          <div
                            style={{
                              flex: '1',
                              minWidth: '200px',
                              maxWidth: '400px',
                            }}
                          >
                            {renderValueInput()}
                          </div>
                          <Button
                            size="small"
                            danger
                            type="text"
                            onClick={() => this.removeFilterRule(rule.id)}
                          >
                            ×
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    type="dashed"
                    size="small"
                    onClick={this.addFilterRule}
                    block
                  >
                    + Add rule
                  </Button>
                </div>
              )}
            </Card>
          </Space>
        </Card>

        <div style={{ padding: '0 16px 16px 16px' }}>
          {isLoadingProjects ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '8px', color: '#666' }}>
                Loading project data...
              </div>
            </div>
          ) : (
            <>
              <StatisticsCards
                stats={{
                  totalTimeSpent: aggregateStats.totalTimeSpent,
                  totalNodes: aggregateStats.totalNodes,
                  completed: aggregateStats.totalCompleted,
                  incomplete: aggregateStats.totalIncomplete,
                  completionRate: aggregateStats.overallCompletionRate || 0,
                  activeProjects: aggregateStats.activeProjects,
                  projectCount: aggregateStats.projectCount,
                  overdueCount: aggregateStats.overdueCount || 0,
                }}
                isAggregate
              />

              <div
                style={{
                  marginTop: 16,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                  gap: '16px',
                }}
              >
                <TimeTrendChart
                  data={this.getTrendData()}
                  title="Time Trend"
                  onPeriodChange={(period) =>
                    this.setState({ trendPeriod: period })
                  }
                  selectedPeriod={trendPeriod}
                />
                <TimeDistributionChart
                  data={this.getDistributionData('parent')}
                  title="Time Distribution by Parent"
                />
                <TimeDistributionChart
                  data={this.getDistributionData('tag')}
                  title="Time Distribution by Tag"
                />
                <ActivityHeatmap
                  data={this.getHeatmapData()}
                  title="Activity Heatmap (Last 30 Days)"
                />
              </div>

              <Card title="Session Analytics" style={{ marginTop: 16 }}>
                {(() => {
                  const sessionStats = this.getSessionAnalytics();
                  return (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <Text type="secondary">Total Sessions</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#1890ff',
                          }}
                        >
                          {sessionStats.totalSessions}
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Average Duration</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#52c41a',
                          }}
                        >
                          {formatTimeHuman(sessionStats.averageDuration)}
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Longest Session</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#faad14',
                          }}
                        >
                          {formatTimeHuman(sessionStats.longestSession)}
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Shortest Session</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#722ed1',
                          }}
                        >
                          {formatTimeHuman(sessionStats.shortestSession)}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>

              <Card title="Completion Analytics" style={{ marginTop: 16 }}>
                {(() => {
                  const completionStats = this.getCompletionAnalytics();
                  return (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <Text type="secondary">Completion Rate</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#52c41a',
                          }}
                        >
                          {completionStats.completionRate}%
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Completed Tasks</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#1890ff',
                          }}
                        >
                          {completionStats.totalCompleted}
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Incomplete Tasks</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#faad14',
                          }}
                        >
                          {completionStats.totalIncomplete}
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Avg Time to Complete</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#722ed1',
                          }}
                        >
                          {Analytics.formatDurationWithDays(
                            completionStats.avgTimeToCompletion,
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>

              <Card title="Productivity Metrics" style={{ marginTop: 16 }}>
                {(() => {
                  const productivity = this.getProductivityMetrics();
                  return (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary">Tasks per Hour</Text>
                          <div
                            style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: '#1890ff',
                            }}
                          >
                            {productivity.tasksPerHour}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary">Focus Sessions</Text>
                          <div
                            style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: '#52c41a',
                            }}
                          >
                            {productivity.focusSessions}
                          </div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            (30+ min sessions)
                          </Text>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary">Most Active Day</Text>
                          <div
                            style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: '#faad14',
                            }}
                          >
                            {productivity.mostActiveDay !== 'N/A'
                              ? moment(productivity.mostActiveDay).format(
                                  'MMM D',
                                )
                              : 'N/A'}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary">Most Active Hour</Text>
                          <div
                            style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: '#722ed1',
                            }}
                          >
                            {productivity.mostActiveHour}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  );
                })()}
              </Card>

              {selectedProjects.length > 1 && (
                <Card title="Project Comparison" style={{ marginTop: 16 }}>
                  {(() => {
                    const comparison = this.getProjectComparison();
                    const columns = [
                      {
                        title: 'Project',
                        dataIndex: 'projectName',
                        key: 'projectName',
                        sorter: (a, b) =>
                          a.projectName.localeCompare(b.projectName),
                      },
                      {
                        title: 'Total Nodes',
                        dataIndex: 'totalNodes',
                        key: 'totalNodes',
                        sorter: (a, b) => a.totalNodes - b.totalNodes,
                      },
                      {
                        title: 'Completed',
                        dataIndex: 'completed',
                        key: 'completed',
                        sorter: (a, b) => a.completed - b.completed,
                      },
                      {
                        title: 'Completion Rate',
                        dataIndex: 'completionRate',
                        key: 'completionRate',
                        sorter: (a, b) => a.completionRate - b.completionRate,
                        render: (rate) => `${rate}%`,
                      },
                      {
                        title: 'Total Time',
                        dataIndex: 'totalTimeSpent',
                        key: 'totalTimeSpent',
                        sorter: (a, b) => a.totalTimeSpent - b.totalTimeSpent,
                        render: (time) => formatTimeHuman(time),
                      },
                      {
                        title: 'Avg Time/Node',
                        dataIndex: 'avgTimePerNode',
                        key: 'avgTimePerNode',
                        sorter: (a, b) => a.avgTimePerNode - b.avgTimePerNode,
                        render: (time) => formatTimeHuman(time),
                      },
                    ];

                    return (
                      <Table
                        dataSource={comparison}
                        columns={columns}
                        rowKey="projectName"
                        pagination={false}
                        size="small"
                      />
                    );
                  })()}
                </Card>
              )}

              <Card title="Forecasting" style={{ marginTop: 16 }}>
                {(() => {
                  const forecast = this.getForecasting();
                  return (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary">Remaining Tasks</Text>
                          <div
                            style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: '#1890ff',
                            }}
                          >
                            {forecast.remaining}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary">
                            Avg Completions/Day (14d)
                          </Text>
                          <div
                            style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: '#52c41a',
                            }}
                          >
                            {forecast.avgCompletionsPerDay}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary">Days to Finish</Text>
                          <div
                            style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: '#faad14',
                            }}
                          >
                            {forecast.daysToFinish !== null
                              ? forecast.daysToFinish
                              : 'N/A'}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary">Estimated Finish Date</Text>
                          <div
                            style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: '#722ed1',
                            }}
                          >
                            {forecast.estimatedFinishDate}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary">
                            Projected Time (next 7 days)
                          </Text>
                          <div
                            style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: '#13c2c2',
                            }}
                          >
                            {formatTimeHuman(forecast.projectedNextWeekTime)}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  );
                })()}
              </Card>
            </>
          )}
        </div>
      </Layout>
    );
  }
}

export default Analytics;
