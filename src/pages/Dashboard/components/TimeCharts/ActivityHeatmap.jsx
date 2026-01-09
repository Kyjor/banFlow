import React from 'react';
import { Card, Empty, Tooltip } from 'antd';
import PropTypes from 'prop-types';
import './TimeCharts.scss';

function ActivityHeatmap({ data, title = 'Activity Heatmap' }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <Card title={title} className="time-chart-card">
        <Empty description="No data available" />
      </Card>
    );
  }

  // Generate last 30 days
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(date);
  }

  const getIntensity = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const activity = data[dateStr] || 0;
    if (activity === 0) return 0;
    if (activity < 3600) return 1; // Less than 1 hour
    if (activity < 7200) return 2; // 1-2 hours
    if (activity < 14400) return 3; // 2-4 hours
    return 4; // 4+ hours
  };

  const getColor = (intensity) => {
    const colors = [
      '#ebedf0', // No activity
      '#c6e48b', // Light
      '#7bc96f', // Medium
      '#239a3b', // High
      '#196127', // Very high
    ];
    return colors[intensity] || colors[0];
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card title={title} className="time-chart-card">
      <div className="heatmap-container">
        <div className="heatmap-grid">
          {days.map((date, index) => {
            const intensity = getIntensity(date);
            const dateStr = date.toISOString().split('T')[0];
            const activity = data[dateStr] || 0;

            return (
              <Tooltip
                key={index}
                title={
                  <div>
                    <div>{formatDate(date)}</div>
                    <div>{formatTime(activity)}</div>
                  </div>
                }
              >
                <div
                  className="heatmap-cell"
                  style={{
                    backgroundColor: getColor(intensity),
                  }}
                />
              </Tooltip>
            );
          })}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="heatmap-legend-colors">
            {[0, 1, 2, 3, 4].map((intensity) => (
              <div
                key={intensity}
                className="heatmap-legend-cell"
                style={{ backgroundColor: getColor(intensity) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </Card>
  );
}

function formatTime(seconds) {
  if (!seconds || seconds === 0) return 'No activity';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

ActivityHeatmap.propTypes = {
  data: PropTypes.object, // { 'YYYY-MM-DD': seconds }
  title: PropTypes.string,
};

ActivityHeatmap.defaultProps = {
  data: {},
  title: 'Activity Heatmap',
};

export default ActivityHeatmap;
