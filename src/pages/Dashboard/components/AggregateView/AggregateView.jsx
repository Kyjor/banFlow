import React, { useState, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Spin,
  message,
  DatePicker,
  Select,
  Space,
  Button,
  Tabs,
  Calendar,
  List,
  Checkbox,
  Badge,
  Collapse,
} from 'antd';
import TabPane from 'antd/lib/tabs/TabPane';
import { ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import moment from 'moment';
import dateFormat from 'dateformat';
import StatisticsCards from '../StatisticsCards/StatisticsCards';
import {
  TimeDistributionChart,
  TimeTrendChart,
  ActivityHeatmap,
} from '../TimeCharts';
import ProjectComparison from '../ProjectComparison/ProjectComparison';
import DayByDayCalendar from '../../../../components/DayByDayCalendar/DayByDayCalendar';
import {
  aggregateProjectStats,
  compareProjects,
  getAggregateRecentActivity,
} from '../../utils/aggregateCalculations';
import { calculateTimeInDateRange } from '../../utils/statisticsCalculations';
import './AggregateView.scss';

const { RangePicker } = DatePicker;
const { Option } = Select;

function AggregateView({
  projectsData,
  selectedProjects,
  onProjectClick,
  isLoading,
  dayCellRender,
  dateCellRender,
}) {
  const [dateRange, setDateRange] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedIteration, setSelectedIteration] = useState(null);
  const [trendPeriod, setTrendPeriod] = useState('week');
  const [selectedDate, setSelectedDate] = useState(moment());
  const [analyticsCollapsed, setAnalyticsCollapsed] = useState(false);

  // Calculate aggregate statistics
  const aggregateStats = useMemo(() => {
    if (!projectsData || projectsData.length === 0) {
      return null;
    }

    let filteredData = projectsData;

    // Apply date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      filteredData = projectsData.map((project) => {
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

    // Apply tag filter
    if (selectedTag) {
      filteredData = filteredData.map((project) => {
        const filteredNodes = project.nodes.filter((node) => {
          const tags = node.tags || [];
          return tags.some((tag) => {
            const tagName =
              typeof tag === 'string' ? tag : tag.title || tag.name;
            return tagName === selectedTag;
          });
        });
        return { ...project, nodes: filteredNodes };
      });
    }

    // Apply iteration filter
    if (selectedIteration) {
      filteredData = filteredData.map((project) => {
        const filteredNodes = project.nodes.filter((node) => {
          const iterationId = node.iterationId || node.iteration;
          return iterationId === selectedIteration;
        });
        return { ...project, nodes: filteredNodes };
      });
    }

    return aggregateProjectStats(filteredData);
  }, [projectsData, dateRange, selectedTag, selectedIteration]);

  // Get all available tags
  const availableTags = useMemo(() => {
    const tagSet = new Set();
    projectsData.forEach((project) => {
      project.nodes?.forEach((node) => {
        const tags = node.tags || [];
        tags.forEach((tag) => {
          const tagName = typeof tag === 'string' ? tag : tag.title || tag.name;
          if (tagName) tagSet.add(tagName);
        });
      });
    });
    return Array.from(tagSet).sort();
  }, [projectsData]);

  // Get all available iterations
  const availableIterations = useMemo(() => {
    const iterationMap = new Map();
    projectsData.forEach((project) => {
      project.iterations?.forEach((iter) => {
        if (!iterationMap.has(iter.id)) {
          iterationMap.set(iter.id, iter.title || iter.id);
        }
      });
    });
    return Array.from(iterationMap.entries()).map(([id, title]) => ({
      id,
      title,
    }));
  }, [projectsData]);

  // Prepare chart data
  const distributionData = useMemo(() => {
    if (!aggregateStats) return {};
    return aggregateStats.timeByParent || {};
  }, [aggregateStats]);

  const trendData = useMemo(() => {
    if (!projectsData || projectsData.length === 0) return [];

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

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = moment(now).subtract(i, 'days');
      const dateStr = date.format('YYYY-MM-DD');
      let totalTime = 0;

      projectsData.forEach((project) => {
        project.nodes?.forEach((node) => {
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
        value: Math.round(totalTime), // Ensure we're using rounded seconds
        date: dateStr,
      });
    }
    return days;
  }, [projectsData, trendPeriod]);

  const heatmapData = useMemo(() => {
    const data = {};
    const today = moment();

    for (let i = 29; i >= 0; i--) {
      const date = today.clone().subtract(i, 'days');
      const dateStr = date.format('YYYY-MM-DD');
      let totalTime = 0;

      projectsData.forEach((project) => {
        project.nodes?.forEach((node) => {
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
  }, [projectsData]);

  const comparisonData = useMemo(() => {
    if (!projectsData || projectsData.length === 0) return [];
    return compareProjects(projectsData);
  }, [projectsData]);

  const handleClearFilters = () => {
    setDateRange(null);
    setSelectedTag(null);
    setSelectedIteration(null);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#666' }}>
          Loading project data...
        </div>
      </div>
    );
  }

  if (!aggregateStats || selectedProjects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        <div>Select projects to view aggregate statistics</div>
      </div>
    );
  }

  return (
    <div className="aggregate-view">
      {/* Top: Statistics Cards */}
      <StatisticsCards
        stats={{
          ...aggregateStats,
          completed: aggregateStats.totalCompleted,
          incomplete: aggregateStats.totalIncomplete,
        }}
        isAggregate
      />

      {/* Calendars and Heatmap */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Calendars side by side */}
          <Row gutter={[16, 16]}>
            {/* Full Calendar */}
            <Col xs={24} sm={12}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.1)',
                  padding: '20px',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  height: '400px',
                  overflow: 'auto',
                }}
              >
                {dateCellRender ? (
                  <Calendar
                    value={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                    }}
                    dateCellRender={dateCellRender}
                    fullscreen={false}
                  />
                ) : (
                  <div>Calendar loading...</div>
                )}
              </div>
            </Col>
            {/* Day by Day Calendar */}
            <Col xs={24} sm={12}>
              {dayCellRender ? (
                <DayByDayCalendar
                  dayCellRender={dayCellRender}
                  currentDate={selectedDate}
                  onDateChange={(date) => {
                    setSelectedDate(date);
                  }}
                />
              ) : (
                <div>Calendar loading...</div>
              )}
            </Col>
          </Row>
          {/* Activity Heatmap under calendars */}
          <div>
            <ActivityHeatmap
              data={heatmapData}
              title="Activity Heatmap (Last 30 Days)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

AggregateView.propTypes = {
  projectsData: PropTypes.arrayOf(
    PropTypes.shape({
      projectName: PropTypes.string.isRequired,
      nodes: PropTypes.array,
      parents: PropTypes.array,
      iterations: PropTypes.array,
      tags: PropTypes.array,
    }),
  ).isRequired,
  selectedProjects: PropTypes.arrayOf(PropTypes.string).isRequired,
  onProjectClick: PropTypes.func,
  isLoading: PropTypes.bool,
  dayCellRender: PropTypes.func,
  dateCellRender: PropTypes.func,
};

AggregateView.defaultProps = {
  isLoading: false,
};

export default AggregateView;
