import React from 'react';
import { Card, Empty, Select, Tooltip } from 'antd';
import PropTypes from 'prop-types';
import { formatTimeHuman } from '../../utils/statisticsCalculations';
import './TimeCharts.scss';

const { Option } = Select;

function TimeTrendChart({ 
  data, 
  title = 'Time Trend',
  onPeriodChange,
  selectedPeriod = 'week'
}) {
  const [period, setPeriod] = React.useState(selectedPeriod);

  React.useEffect(() => {
    setPeriod(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (value) => {
    setPeriod(value);
    if (onPeriodChange) {
      onPeriodChange(value);
    }
  };

  if (!data || data.length === 0) {
    return (
      <Card 
        title={title}
        className="time-chart-card"
        extra={
          <Select value={period} onChange={handlePeriodChange} size="small" style={{ width: 100 }}>
            <Option value="week">Week</Option>
            <Option value="month">Month</Option>
            <Option value="quarter">Quarter</Option>
          </Select>
        }
      >
        <Empty description="No data available" />
      </Card>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartHeight = 200;
  const yAxisHeight = chartHeight - 40;
  
  // Generate Y-axis labels (0 at bottom, max at top)
  const yAxisLabels = [];
  const numLabels = 5;
  for (let i = 0; i <= numLabels; i++) {
    const value = (maxValue / numLabels) * i; // Start from 0, go to maxValue
    yAxisLabels.push({
      value: Math.round(value),
      position: (i / numLabels) * yAxisHeight,
    });
  }

  return (
    <Card 
      title={title}
      className="time-chart-card"
      extra={
        <Select value={period} onChange={handlePeriodChange} size="small" style={{ width: 120 }}>
          <Option value="week">Last 7 Days</Option>
          <Option value="month">Last 30 Days</Option>
          <Option value="quarter">Last 90 Days</Option>
        </Select>
      }
    >
      <div className="trend-chart-container">
        {/* Y-axis labels */}
        <div className="trend-chart-y-axis">
          {yAxisLabels.map((label, index) => (
            <div
              key={index}
              className="trend-chart-y-label"
              style={{ bottom: `${label.position}px` }}
            >
              {formatTimeForChart(label.value, maxValue)}
            </div>
          ))}
        </div>
        
        {/* Chart area */}
        <div className="trend-chart" style={{ height: `${chartHeight}px` }}>
          <div className="trend-chart-bars">
            {data.map((item, index) => {
              const barHeight = maxValue > 0 ? (item.value / maxValue) * yAxisHeight : 0;
              return (
                <Tooltip
                  key={index}
                  title={
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{item.label}</div>
                      <div>Time: {formatTimeHuman(item.value)}</div>
                      {item.date && <div style={{ fontSize: '11px', opacity: 0.8 }}>{item.date}</div>}
                    </div>
                  }
                  placement="top"
                >
                  <div className="trend-bar-item">
                    <div className="trend-bar-container" style={{ height: `${yAxisHeight}px` }}>
                      <div
                        className="trend-bar"
                        style={{
                          height: `${barHeight}px`,
                          backgroundColor: '#1890ff',
                        }}
                      />
                    </div>
                    <div className="trend-bar-label">{item.label}</div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Format time for chart display - simplified based on max value
function formatTimeForChart(seconds, maxValue) {
  if (!seconds || seconds === 0) return '0';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  // If max value is >= 1 hour, show only hours
  if (maxValue >= 3600) {
    if (hours > 0) {
      return `${hours}h`;
    }
    return '0';
  }
  
  // If max value is >= 1 minute, show hours and minutes (no seconds)
  if (maxValue >= 60) {
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return minutes > 0 ? `${minutes}m` : '0';
  }
  
  // Otherwise show seconds
  return `${secs}s`;
}

TimeTrendChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })),
  title: PropTypes.string,
  onPeriodChange: PropTypes.func,
  selectedPeriod: PropTypes.string,
};

TimeTrendChart.defaultProps = {
  data: [],
  title: 'Time Trend',
  selectedPeriod: 'week',
};

export default TimeTrendChart;

