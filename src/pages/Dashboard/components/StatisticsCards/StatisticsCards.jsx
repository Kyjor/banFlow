import React from 'react';
import { Card, Row, Col, Statistic, Progress, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ProjectOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import PropTypes from 'prop-types';
import { formatTimeHuman } from '../../utils/statisticsCalculations';
import './StatisticsCards.scss';

function StatisticsCards({ stats, isAggregate = false }) {
  const {
    totalTimeSpent = 0,
    totalNodes = 0,
    completed = 0,
    incomplete = 0,
    completionRate = 0,
    activeProjects = 0,
    overdueCount = 0,
    projectCount = 0,
  } = stats;

  const cards = [
    {
      title: 'Total Time Spent',
      value: formatTimeHuman(totalTimeSpent),
      icon: <ClockCircleOutlined />,
      color: '#1890ff',
      suffix: '',
    },
    {
      title: 'Total Nodes',
      value: totalNodes,
      icon: <FileTextOutlined />,
      color: '#52c41a',
      suffix: '',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      icon: <TrophyOutlined />,
      color: '#722ed1',
      suffix: (
        <Progress
          percent={completionRate}
          size="small"
          strokeColor={
            completionRate >= 75
              ? '#52c41a'
              : completionRate >= 50
                ? '#faad14'
                : '#ff4d4f'
          }
          showInfo={false}
          style={{ marginTop: '8px' }}
        />
      ),
    },
    {
      title: isAggregate ? 'Active Projects' : 'Completed Nodes',
      value: isAggregate ? activeProjects : completed,
      icon: isAggregate ? <ProjectOutlined /> : <CheckCircleOutlined />,
      color: isAggregate ? '#13c2c2' : '#52c41a',
      suffix:
        isAggregate && projectCount > 0
          ? `of ${projectCount} total`
          : incomplete > 0
            ? `(${incomplete} remaining)`
            : '',
    },
  ];

  if (overdueCount > 0) {
    cards.push({
      title: 'Overdue Items',
      value: overdueCount,
      icon: <WarningOutlined />,
      color: '#ff4d4f',
      suffix: '',
    });
  }

  return (
    <Row gutter={[16, 16]} className="statistics-cards">
      {cards.map((card, index) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={index}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={
                <Tooltip title={card.title}>
                  <span className="stat-title">{card.title}</span>
                </Tooltip>
              }
              value={card.value}
              prefix={<span style={{ color: card.color }}>{card.icon}</span>}
              suffix={card.suffix}
              valueStyle={{ color: card.color, fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

StatisticsCards.propTypes = {
  stats: PropTypes.shape({
    totalTimeSpent: PropTypes.number,
    totalNodes: PropTypes.number,
    completed: PropTypes.number,
    incomplete: PropTypes.number,
    completionRate: PropTypes.number,
    activeProjects: PropTypes.number,
    overdueCount: PropTypes.number,
    projectCount: PropTypes.number,
  }).isRequired,
  isAggregate: PropTypes.bool,
};

StatisticsCards.defaultProps = {
  isAggregate: false,
};

export default StatisticsCards;
