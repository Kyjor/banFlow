// Libs
import React from 'react';
// Styles
import PropTypes from 'prop-types';
import moment from 'moment';
import {
  DoubleLeftOutlined,
  DoubleRightOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';

class DayByDayCalendar extends React.Component {
  constructor(props) {
    super(props);
    const today = moment();
    const tomorrow = moment().add(1, 'day');
    const yesterday = moment().subtract(1, 'day');
    const currentDate = props.currentDate ? moment(props.currentDate) : today;
    this.state = {
      currentDate,
      today,
      tomorrow,
      yesterday,
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.currentDate) {
      const prevMoment = prevProps.currentDate ? moment(prevProps.currentDate) : null;
      const currentMoment = moment(this.props.currentDate);
      if (!prevMoment || !prevMoment.isSame(currentMoment, 'day')) {
        this.setState({ currentDate: currentMoment });
      }
    }
  }

  header = () => {
    const { currentDate, today, tomorrow, yesterday } = this.state;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#2c3e50',
          borderRadius: '8px',
          marginBottom: '16px',
          color: 'white',
          fontWeight: 600,
          fontSize: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <DoubleLeftOutlined
          style={{
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px',
            borderRadius: '4px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
          onClick={() => {
            this.incrementDays(-7);
          }}
        />
        <LeftOutlined
          style={{
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px',
            borderRadius: '4px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
          onClick={() => {
            this.incrementDays(-1);
          }}
        />
        <div
          style={{
            cursor: 'pointer',
            flex: 1,
            textAlign: 'center',
          }}
        >
          {currentDate.isSame(yesterday, 'day') && (
            <span>Yesterday, </span>
          )}
          {currentDate.isSame(today, 'day') && (
            <span>Today, </span>
          )}
          {currentDate.isSame(tomorrow, 'day') && (
            <span>Tomorrow, </span>
          )}
          {currentDate.format('YYYY/MM/DD')}
        </div>
        <RightOutlined
          style={{
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px',
            borderRadius: '4px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
          onClick={() => {
            this.incrementDays(1);
          }}
        />
        <DoubleRightOutlined
          style={{
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px',
            borderRadius: '4px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
          onClick={() => {
            this.incrementDays(7);
          }}
        />
      </div>
    );
  };

  incrementDays = (days) => {
    const { currentDate } = this.state;
    const newDay = moment(currentDate).add(days, 'days');
    this.setState({ currentDate: newDay });
    if (this.props.onDateChange) {
      this.props.onDateChange(newDay);
    }
  };

  render() {
    const { currentDate } = this.state;
    const { dayCellRender } = this.props;

    return (
      <div style={{ 
        height: '400px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        border: '1px solid rgba(0, 0, 0, 0.06)',
      }}>
        <div style={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {dayCellRender({ _d: currentDate.toDate() }, this.header)}
        </div>
      </div>
    );
  }
}
DayByDayCalendar.propTypes = {
  dayCellRender: PropTypes.func.isRequired,
  currentDate: PropTypes.oneOfType([
    PropTypes.instanceOf(Date),
    PropTypes.object, // moment object
  ]),
  onDateChange: PropTypes.func,
};
export default DayByDayCalendar;
