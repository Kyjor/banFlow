/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { useTimer } from 'react-use-precision-timer';
import PropTypes from 'prop-types';

// The callback will be called every 1000 milliseconds.
function StopWatch(props) {
  const { clickToToggle, nodeId, onToggle, saveTime, startingSeconds } = props;
  const [seconds, setSeconds] = useState(startingSeconds || 0);
  const [isActive, setIsActive] = useState(false);

  const timer = useTimer({
    delay: 1000,
    callback: () => {
      if (seconds < startingSeconds) {
        setSeconds(startingSeconds);
      }
      if (seconds % 10 === 0 && seconds !== 0 && saveTime) {
        saveTime(seconds, nodeId);
      }

      setSeconds(seconds + 1);
    },
  });

  function toggle() {
    if (timer.isRunning() && saveTime) {
      timer.stop();
      if (nodeId) {
        // Todo: end session
      }
    } else {
      timer.start();
      if (nodeId) {
        // Todo: start session
      }
    }

    setIsActive(!isActive);
    if (onToggle) {
      onToggle();
    }
  }

  useEffect(() => {
    if (!clickToToggle) {
      toggle();
    }
  }, []);
  useEffect(() => {
    setSeconds(startingSeconds);
  }, [startingSeconds]);
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <div
        className="time"
        style={{ fontSize: '100%' }}
        onClick={() => {
          if (clickToToggle) {
            toggle();
          }
        }}
      >
        {new Date((seconds ?? 0) * 1000).toISOString().substr(11, 8)}
      </div>
    </>
  );
}

export default StopWatch;

StopWatch.propTypes = {
  clickToToggle: PropTypes.bool.isRequired,
  nodeId: PropTypes.number.isRequired,
  onToggle: PropTypes.func.isRequired,
  saveTime: PropTypes.func.isRequired,
  startingSeconds: PropTypes.number.isRequired,
};
