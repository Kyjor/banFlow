import React from 'react';
import { Card, Empty } from 'antd';
import PropTypes from 'prop-types';
import './TimeCharts.scss';

function TimeDistributionChart({ data, title = 'Time Distribution by Status' }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <Card title={title} className="time-chart-card">
        <Empty description="No data available" />
      </Card>
    );
  }

  const entries = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const maxValue = Math.max(...entries.map(e => e.value));

  const colors = [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', 
    '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'
  ];

  return (
    <Card title={title} className="time-chart-card">
      <div className="distribution-chart">
        {entries.map((entry, index) => {
          const percentage = total > 0 ? (entry.value / total) * 100 : 0;
          const barWidth = maxValue > 0 ? (entry.value / maxValue) * 100 : 0;
          const color = colors[index % colors.length];

          return (
            <div key={entry.name} className="distribution-item">
              <div className="distribution-label">
                <span className="label-name">{entry.name}</span>
                <span className="label-value">
                  {formatTime(entry.value)} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="distribution-bar-container">
                <div
                  className="distribution-bar"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color,
                  }}
                >
                  <div className="distribution-bar-fill" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function formatTime(seconds) {
  if (!seconds || seconds === 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

TimeDistributionChart.propTypes = {
  data: PropTypes.object,
  title: PropTypes.string,
};

TimeDistributionChart.defaultProps = {
  data: {},
  title: 'Time Distribution by Status',
};

export default TimeDistributionChart;

