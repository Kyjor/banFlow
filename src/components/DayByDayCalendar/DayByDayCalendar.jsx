// Libs
import React from 'react';
// Styles
import PropTypes from 'prop-types';
import {
  DoubleLeftOutlined,
  DoubleRightOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';

class DayByDayCalendar extends React.Component {
  constructor(props) {
    super(props);
    const today = new Date();
    const tomorrow = new Date(today.getTime());
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today.getTime());
    yesterday.setDate(today.getDate() - 1);
    this.state = {
      currentDate: today,
      today,
      tomorrow,
      yesterday,
    };
  }

  header = () => {
    const { currentDate, today, tomorrow, yesterday } = this.state;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <DoubleLeftOutlined
          style={{
            cursor: 'pointer',
          }}
          onClick={() => {
            this.incrementDays(-7);
          }}
        />
        <LeftOutlined
          style={{
            cursor: 'pointer',
          }}
          onClick={() => {
            this.incrementDays(-1);
          }}
        />
        <div
          style={{
            cursor: 'pointer',
          }}
        >
          {currentDate.toJSON().slice(0, 10).replace(/-/g, '/') ===
            yesterday.toJSON().slice(0, 10).replace(/-/g, '/') && (
            <span>Yesterday, </span>
          )}
          {currentDate.toJSON().slice(0, 10).replace(/-/g, '/') ===
            today.toJSON().slice(0, 10).replace(/-/g, '/') && (
            <span>Today, </span>
          )}
          {currentDate.toJSON().slice(0, 10).replace(/-/g, '/') ===
            tomorrow.toJSON().slice(0, 10).replace(/-/g, '/') && (
            <span>Tomorrow, </span>
          )}
          {currentDate.toJSON().slice(0, 10).replace(/-/g, '/')}
        </div>
        <RightOutlined
          style={{
            cursor: 'pointer',
          }}
          onClick={() => {
            this.incrementDays(1);
          }}
        />
        <DoubleRightOutlined
          style={{
            cursor: 'pointer',
          }}
          onClick={() => {
            this.incrementDays(7);
          }}
        />
      </div>
    );
  };

  incrementDays = (days) => {
    const { currentDate } = this.state;
    const newDay = new Date(currentDate.getTime());
    newDay.setDate(currentDate.getDate() + days);
    this.setState({ currentDate: newDay });
  };

  render() {
    const { currentDate } = this.state;
    const { dayCellRender } = this.props;

    return (
      <div style={{ height: '400px' }}>
        <div style={{ height: '100%' }}>
          {dayCellRender({ _d: currentDate }, this.header)}
        </div>
      </div>
    );
  }
}
DayByDayCalendar.propTypes = {
  dayCellRender: PropTypes.func.isRequired,
};
export default DayByDayCalendar;
