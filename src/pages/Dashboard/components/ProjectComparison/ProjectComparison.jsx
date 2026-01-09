import React from 'react';
import { Card, Table, Tag, Progress, Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { formatTimeHuman } from '../../utils/statisticsCalculations';
import './ProjectComparison.scss';

function ProjectComparison({ projects, onProjectClick }) {
  if (!projects || projects.length === 0) {
    return (
      <Card title="Project Comparison" className="project-comparison-card">
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          Select multiple projects to compare
        </div>
      </Card>
    );
  }

  const columns = [
    {
      title: 'Project',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (text, record) => (
        <Link
          to={`/projectPage/${text}`}
          onClick={(e) => {
            if (onProjectClick) {
              e.preventDefault();
              onProjectClick(text);
            }
          }}
        >
          {text}
        </Link>
      ),
      sorter: (a, b) => a.projectName.localeCompare(b.projectName),
    },
    {
      title: 'Total Time',
      dataIndex: 'totalTime',
      key: 'totalTime',
      render: (value) => (
        <Tooltip title={`${value} seconds`}>
          <span style={{ fontWeight: 'bold' }}>{formatTimeHuman(value)}</span>
        </Tooltip>
      ),
      sorter: (a, b) => a.totalTime - b.totalTime,
      defaultSortOrder: 'descend',
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
      render: (rate) => (
        <div>
          <Progress
            percent={rate}
            size="small"
            strokeColor={
              rate >= 75 ? '#52c41a' : rate >= 50 ? '#faad14' : '#ff4d4f'
            }
            format={() => `${rate}%`}
          />
        </div>
      ),
      sorter: (a, b) => a.completionRate - b.completionRate,
    },
    {
      title: 'Overdue',
      dataIndex: 'overdueCount',
      key: 'overdueCount',
      render: (count) =>
        count > 0 ? (
          <Tag color="red">{count}</Tag>
        ) : (
          <Tag color="default">0</Tag>
        ),
      sorter: (a, b) => a.overdueCount - b.overdueCount,
    },
    {
      title: 'Recent Activity',
      dataIndex: 'recentActivityCount',
      key: 'recentActivityCount',
      render: (count) => (
        <Tag color={count > 0 ? 'green' : 'default'}>{count} sessions</Tag>
      ),
      sorter: (a, b) => a.recentActivityCount - b.recentActivityCount,
    },
  ];

  const dataSource = projects.map((project, index) => ({
    key: index,
    ...project,
  }));

  return (
    <Card title="Project Comparison" className="project-comparison-card">
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        className="comparison-table"
      />
    </Card>
  );
}

ProjectComparison.propTypes = {
  projects: PropTypes.arrayOf(
    PropTypes.shape({
      projectName: PropTypes.string.isRequired,
      totalTime: PropTypes.number.isRequired,
      totalNodes: PropTypes.number.isRequired,
      completed: PropTypes.number.isRequired,
      completionRate: PropTypes.number.isRequired,
      overdueCount: PropTypes.number.isRequired,
      recentActivityCount: PropTypes.number.isRequired,
    }),
  ),
  onProjectClick: PropTypes.func,
};

ProjectComparison.defaultProps = {
  projects: [],
};

export default ProjectComparison;
