import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { useTimer } from 'react-use-precision-timer';
import { Button, Checkbox, Popover } from 'antd';
import {
  CaretRightOutlined,
  PauseOutlined,
  StepForwardOutlined,
} from '@ant-design/icons';
import EditableTextArea from '../EditableTextArea/EditableTextArea';

const SESSION_END_NOTIFICATION_TITLE = 'Round Over';
const BREAK_END_NOTIFICATION_TITLE = 'Break Over';
const SESSION_END_NOTIFICATION_BODY =
  'Your round of work is over. Time to take a break.';
const BREAK_END_NOTIFICATION_BODY =
  'Your break is over. Time to get back to work.';
const CLICK_MESSAGE = 'Notification clicked';

function showRoundOverNotification() {
  new Notification(SESSION_END_NOTIFICATION_TITLE, {
    body: SESSION_END_NOTIFICATION_BODY,
  }).onclick = () => console.log(CLICK_MESSAGE);
}

function showBreakOverNotification() {
  new Notification(BREAK_END_NOTIFICATION_TITLE, {
    body: BREAK_END_NOTIFICATION_BODY,
  }).onclick = () => console.log(CLICK_MESSAGE);
}

// The callback will be called every 1000 milliseconds.
function Timer(props) {
  function reducer(prev, next) {
    return { ...prev, ...next };
  }

  const [event, updateEvent] = useReducer(reducer, {
    isActive: false,
    isHovered: false,
    isOnBreak: false,
    isTomatoTimerActive: false,
    isBetweenRounds: false,
    tomatoTimerRound: 0,
    tomatoSeconds: 0,
    breakSeconds: 0,
    timerPreferences: null,
    betweenRoundSeconds: 5,
  });

  function toggle() {
    if (timer.isRunning()) {
      timer.stop();
      if (props.selectedNode) {
        props.endSession(props.seconds);
      }
    } else {
      if (props.selectedNode) {
        props.startSession(props.seconds);
      }
      timer.start();
    }

    updateEvent({ isActive: !event.isActive });
  }

  function toggleTomatoTimer() {
    if (
      (event.isOnBreak || event.isBetweenRounds || event.isTomatoTimerActive) &&
      event.isActive
    ) {
      updateEvent({
        isTomatoTimerActive: false,
        isOnBreak: false,
        isBetweenRounds: false,
      });
      return;
    }
    updateEvent({
      isTomatoTimerActive: true,
      tomatoTimerRound: 1,
      tomatoSeconds: event.timerPreferences.time * 60,
    });
  }

  function cycleTomatoTimer() {
    if (!event.isActive) {
      return;
    }
    updateEvent({ tomatoSeconds: event.timerPreferences.time * 60 });

    // In between timer and break
    if (!event.isBetweenRounds && event.isTomatoTimerActive) {
      showRoundOverNotification();
      // setIsActive(false);
      updateEvent({ isBetweenRounds: true, betweenRoundSeconds: 5 });

      if (event.timerPreferences.autoCycle) {
        // TODO: set between rounds time
      }
    }
    // Moving to break
    else if (event.isBetweenRounds && event.isTomatoTimerActive) {
      // setIsActive(false);
      updateEvent({
        isBetweenRounds: false,
        isTomatoTimerActive: false,
        isOnBreak: true,
      });

      if (event.tomatoTimerRound < 4) {
        updateEvent({ breakSeconds: event.timerPreferences.shortBreak * 60 });
      } else if (event.tomatoTimerRound === 4) {
        updateEvent({ breakSeconds: event.timerPreferences.longBreak * 60 });
      }
    }
    // Between break and new tomato timer
    else if (!event.isBetweenRounds && event.isOnBreak) {
      showBreakOverNotification();
      // setIsActive(false);
      updateEvent({ isBetweenRounds: true, betweenRoundSeconds: 5 });

      if (event.timerPreferences.autoCycle) {
        // TODO: set between rounds time
      }
    }
    // Move to new tomato round
    else if (event.isBetweenRounds && event.isOnBreak) {
      updateEvent({
        isBetweenRounds: false,
        isOnBreak: false,
        isTomatoTimerActive: true,
      });

      if (event.tomatoTimerRound < 4) {
        updateEvent({ tomatoTimerRound: event.tomatoTimerRound + 1 });
      } else if (event.tomatoTimerRound === 4) {
        updateEvent({ tomatoTimerRound: 1 });
      }
      // setIsActive(true);
    }
  }

  const handleHoverChange = (visible) => {
    updateEvent({ isHovered: visible });
  };
  const timer = useTimer({
    delay: 1000,
    callback: () => {
      if (props.seconds % 10 === 0 && props.seconds !== 0) {
        if (props.selectedNode) {
          props.saveTime();
        }
      }
      if (event.betweenRoundSeconds <= 0 && event.isBetweenRounds) {
        cycleTomatoTimer();
        return;
      }
      if (
        (event.tomatoSeconds <= 0 && event.isTomatoTimerActive) ||
        (event.breakSeconds <= 0 && event.isOnBreak && !event.isBetweenRounds)
      ) {
        cycleTomatoTimer();
        return;
      }

      if (event.isTomatoTimerActive && !event.isBetweenRounds) {
        updateEvent({ tomatoSeconds: event.tomatoSeconds - 1 });
      }
      if (event.isOnBreak && !event.isBetweenRounds) {
        updateEvent({ breakSeconds: event.breakSeconds - 1 });
      }
      if (event.isBetweenRounds && event.timerPreferences.autoCycle) {
        updateEvent({ betweenRoundSeconds: event.betweenRoundSeconds - 1 });
      }
      if (!event.isOnBreak && !event.isBetweenRounds) {
        props.updateSeconds(props.seconds + 1);
      }
    },
  });
  useEffect(() => {
    timer.stop();
    updateEvent({ isActive: false });
  }, [props.selectedNode]);
  useEffect(() => {
    updateEvent({ timerPreferences: props.timerPreferences });
  }, [props.timerPreferences]);

  function handleTomatoTimerButtonClick() {
    !event.isActive ? (toggle(), toggleTomatoTimer()) : toggleTomatoTimer();
  }

  function handlePlayButtonClick() {
    event.isActive && !event.isBetweenRounds
      ? toggle()
      : event.isBetweenRounds
        ? cycleTomatoTimer()
        : toggle();
  }

  const hoverContent = (
    <div
      style={{
        display: `flex`,
        flexDirection: `row`,
      }}
    >
      <div
        style={{
          width: `60%`,
        }}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
          <div style={{ width: '55%' }}>Time:</div>
          {event.timerPreferences && (
            <EditableTextArea
              defaultValue={event.timerPreferences.time}
              style={{ width: '30%', resize: 'none', height: '15px' }}
              maxLength={3}
              autoSize={{ maxRows: 1 }}
              updateText={(value) => {
                props.updateTimerPreferenceProperty(`time`, value);
                updateEvent({
                  timerPreferences: {
                    ...event.timerPreferences,
                    time: value,
                  },
                });
              }}
            />
          )}
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
          <div style={{ width: '55%' }}>Short Break:</div>
          {event.timerPreferences && (
            <EditableTextArea
              defaultValue={event.timerPreferences.shortBreak}
              style={{ width: '30%', resize: 'none', height: '10px' }}
              // showCount={this.state.textSelected}
              maxLength={3}
              autoSize={{ maxRows: 1 }}
              updateText={(value) => {
                props.updateTimerPreferenceProperty(`shortBreak`, value);
                updateEvent({
                  timerPreferences: {
                    ...event.timerPreferences,
                    shortBreak: value,
                  },
                });
              }}
            />
          )}
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
          <div style={{ width: '55%' }}>Long Break:</div>
          {event.timerPreferences && (
            <EditableTextArea
              defaultValue={event.timerPreferences.longBreak}
              style={{ width: '30%', resize: 'none', height: '15px' }}
              // showCount={this.state.textSelected}
              maxLength={3}
              autoSize={{ maxRows: 1 }}
              value={0}
              updateText={(value) => {
                props.updateTimerPreferenceProperty(`longBreak`, value);
                updateEvent({
                  timerPreferences: {
                    ...event.timerPreferences,
                    longBreak: value,
                  },
                });
              }}
            />
          )}
        </div>
      </div>
      <div
        style={{
          width: `40%`,
        }}
      >
        <div>
          <div>Auto Cycle:</div>
          <div>
            {event.timerPreferences && (
              <Checkbox
                defaultChecked={event.timerPreferences.autoCycle}
                onChange={(e) => {
                  props.updateTimerPreferenceProperty(
                    `autoCycle`,
                    e.target.checked,
                  );
                  updateEvent({
                    timerPreferences: {
                      ...event.timerPreferences,
                      autoCycle: e.target.checked,
                    },
                  });
                }}
              />
            )}
          </div>
        </div>
        <Button
          onClick={handleTomatoTimerButtonClick}
          style={{
            backgroundColor: '#ec8e8e',
            color: 'black',
            marginTop: '30px',
          }}
        >
          {(event.isOnBreak ||
            event.isBetweenRounds ||
            event.isTomatoTimerActive) &&
          event.isActive
            ? `Stop`
            : `Start`}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {(event.isOnBreak ||
        event.isBetweenRounds ||
        event.isTomatoTimerActive) &&
        event.isActive && (
          <div
            className="time"
            style={{
              fontSize: '12px',
              textAlign: 'right',
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-around',
              // overflow:'hidden',
            }}
          >
            <div>Round: {event.tomatoTimerRound}</div>
            <div>
              {event.isActive && !event.isOnBreak && !event.isBetweenRounds ? (
                <div>Tomato Time Active</div>
              ) : event.isOnBreak && !event.isBetweenRounds ? (
                <div>On Break</div>
              ) : event.isActive ? (
                <div>Between Rounds</div>
              ) : (
                <div>Inactive</div>
              )}
            </div>
            <div>
              Time Left:
              {new Date(
                (event.isActive &&
                !event.isOnBreak &&
                !event.isBetweenRounds &&
                event.isTomatoTimerActive
                  ? event.tomatoSeconds
                  : event.isOnBreak && !event.isBetweenRounds
                    ? event.breakSeconds
                    : event.isActive
                      ? event.betweenRoundSeconds
                      : 0) * 1000,
              )
                .toISOString()
                .substr(11, 8)}
            </div>
          </div>
        )}
      <div
        className="time"
        style={{
          fontSize: '60px',
          textAlign: 'center',
          width: '100%',
          overflow: 'hidden',
          marginTop: `${
            (event.isOnBreak ||
              event.isBetweenRounds ||
              event.isTomatoTimerActive) &&
            event.isActive
              ? `-25px`
              : `-15px`
          }`,
        }}
      >
        {new Date((props.seconds ?? 0) * 1000).toISOString().substr(11, 8)}
      </div>
      <div
        className="row"
        style={{
          marginBottom: '5px',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-evenly',
        }}
      >
        <Button
          className={`button button-primary button-primary-${
            event.isActive ? 'active' : 'inactive'
          }`}
          onClick={handlePlayButtonClick}
        >
          {event.isActive && !event.isBetweenRounds ? (
            <PauseOutlined />
          ) : event.isBetweenRounds ? (
            <StepForwardOutlined />
          ) : (
            <CaretRightOutlined />
          )}
        </Button>
        <Popover
          style={{ width: '75px' }}
          content={hoverContent}
          title="Tomato Timer(Times in minutes)"
          trigger="hover"
          visible={event.isHovered}
          onVisibleChange={handleHoverChange}
        >
          <Button className={`button button-primary `}>
            Tomato Timer (Popup)
          </Button>
        </Popover>
      </div>
    </>
  );
}

export default Timer;

Timer.propTypes = {
  endSession: PropTypes.func,
  seconds: PropTypes.number,
  selectedNode: PropTypes.object,
  startSession: PropTypes.func,
  timerPreferences: PropTypes.object,
  updateSeconds: PropTypes.func,
  updateTimerPreferenceProperty: PropTypes.func,
};
