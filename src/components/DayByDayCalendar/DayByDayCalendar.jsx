// Libs
import React, { Component } from 'react';
// Styles
import PropTypes from 'prop-types';
import { Icon } from 'antd';
import { DoubleLeftOutlined, DoubleRightOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';

/**
 * DayByDayCalendar
 *
 * @class DayByDayCalendar
 * @extends {Component}
 */
class DayByDayCalendar extends Component {
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
          {this.state.currentDate.toJSON().slice(0, 10).replace(/-/g, '/') ===
            this.state.yesterday.toJSON().slice(0, 10).replace(/-/g, '/') && (
            <span>Yesterday, </span>
          )}
          {this.state.currentDate.toJSON().slice(0, 10).replace(/-/g, '/') ===
            this.state.today.toJSON().slice(0, 10).replace(/-/g, '/') && (
            <span>Today, </span>
          )}
          {this.state.currentDate.toJSON().slice(0, 10).replace(/-/g, '/') ===
            this.state.tomorrow.toJSON().slice(0, 10).replace(/-/g, '/') && (
            <span>Tomorrow, </span>
          )}
          {this.state.currentDate.toJSON().slice(0, 10).replace(/-/g, '/')}
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
    return (
      <div style={{ height: '400px' }}>
        <div style={{ height: '100%' }}>
          {this.props.dayCellRender(
            { _d: this.state.currentDate },
            this.header,
          )}
        </div>
      </div>
    );
  }
}
DayByDayCalendar.propTypes = {
  dayCellRender: PropTypes.func,
};
export default DayByDayCalendar;
