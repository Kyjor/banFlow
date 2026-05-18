/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

// The callback will be called every 1000 milliseconds.
function StopWatch(props) {
  const { startingSeconds } = props;
  const [seconds, setSeconds] = useState(startingSeconds || 0);

  useEffect(() => {
    setSeconds(startingSeconds);
  }, [startingSeconds]);
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <div className="time" style={{ fontSize: '100%' }}>
        {new Date((seconds ?? 0) * 1000).toISOString().substr(11, 8)}
      </div>
    </>
  );
}

export default StopWatch;

StopWatch.propTypes = {
  startingSeconds: PropTypes.number.isRequired,
};
