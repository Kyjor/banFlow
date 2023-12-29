import React, { useState, useEffect } from 'react';
import { useTimer } from 'react-use-precision-timer';
import PropTypes from 'prop-types';
import ProjectList from '../Projects/ProjectItems/ProjectList';

// The callback will be called every 1000 milliseconds.
const StopWatch = (props) => {
  const [seconds, setSeconds] = useState(
    props.startingSeconds ? props.startingSeconds : 0
  );
  const [isActive, setIsActive] = useState(false);

  function toggle() {
    if (timer.isRunning() && props.saveTime) {
      timer.stop();
      // props.saveTime(seconds, props.nodeId);
      if (props.nodeId) {
        // Todo: end session
      }
    } else {
      timer.start();
      if (props.nodeId) {
        // Todo: start session
      }
    }

    setIsActive(!isActive);
    if (props.onToggle) {
      props.onToggle();
    }
  }
  const timer = useTimer({
    delay: 1000,
    callback: () => {
      if (seconds < props.startingSeconds) {
        setSeconds(props.startingSeconds);
      }
      if (seconds % 10 === 0 && seconds !== 0 && props.saveTime) {
        props.saveTime(seconds, props.nodeId);
      }

      setSeconds(seconds + 1);
    },
  });
  useEffect(() => {
    if (!props.clickToToggle) {
      toggle();
    }
  }, []);
  useEffect(() => {
    setSeconds(props.startingSeconds);
  }, [props.startingSeconds]);
  return (
    <div
      className="time"
      style={{ fontSize: '100%' }}
      onClick={(e) => {
        if (props.clickToToggle) {
          toggle();
        }
      }}
    >
      {new Date(seconds * 1000).toISOString().substr(11, 8)}
    </div>
  );
};

export default StopWatch;

StopWatch.propTypes = {
  clickToToggle: PropTypes.bool.isRequired,
  nodeId: PropTypes.number.isRequired,
  onToggle: PropTypes.func.isRequired,
  saveTime: PropTypes.func.isRequired,
  startingSeconds: PropTypes.number.isRequired,
};
