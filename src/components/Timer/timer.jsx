/* eslint-disable react-hooks/exhaustive-deps,react/destructuring-assignment,no-nested-ternary */
import React, { useEffect, useReducer, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTimer } from 'react-use-precision-timer';
import { Button, Tag, Tooltip } from 'antd';
import {
  CaretRightOutlined,
  PauseOutlined,
  StepForwardOutlined,
} from '@ant-design/icons';
import {
  defaultTimerPreferences,
  normalizeTimerPreferences,
} from '../../stores/shared';
import { sendDesktopNotification } from '../../utils/desktopNotification';
import eventSystem, { PLUGIN_EVENTS } from '../../services/EventSystem';
import { setTimerPhase } from '../../plugins/host/TimerPhaseStore';
import { registerTimerControls } from '../../plugins/host/timerBridge';

const SESSION_END_NOTIFICATION_TITLE = 'Round Over';
const BREAK_END_NOTIFICATION_TITLE = 'Break Over';
const SESSION_END_NOTIFICATION_BODY =
  'Your round of work is over. Time to take a break.';
const BREAK_END_NOTIFICATION_BODY =
  'Your break is over. Time to get back to work.';

function showRoundOverNotification() {
  void sendDesktopNotification(
    SESSION_END_NOTIFICATION_TITLE,
    SESSION_END_NOTIFICATION_BODY,
  );
}

function showBreakOverNotification() {
  void sendDesktopNotification(
    BREAK_END_NOTIFICATION_TITLE,
    BREAK_END_NOTIFICATION_BODY,
  );
}

function showBreakStartingNotification(breakMinutes) {
  void sendDesktopNotification(
    'Break time',
    `Take a ${breakMinutes} minute break.`,
  );
}

function showWorkStartingNotification(round, workMinutes) {
  void sendDesktopNotification(
    'Focus time',
    `Starting round ${round} — ${workMinutes} minutes of work.`,
  );
}

function formatDuration(totalSeconds) {
  return new Date((totalSeconds ?? 0) * 1000).toISOString().substr(11, 8);
}

// The callback will be called every 1000 milliseconds.
function Timer(props) {
  function reducer(prev, next) {
    return { ...prev, ...next };
  }

  const [event, updateEvent] = useReducer(reducer, {
    isActive: false,
    isOnBreak: false,
    isTomatoTimerActive: false,
    isBetweenRounds: false,
    tomatoTimerRound: 0,
    tomatoSeconds: 0,
    breakSeconds: 0,
    timerPreferences: null,
    betweenRoundSeconds: 5,
  });

  const eventRef = useRef(event);
  eventRef.current = event;

  const propsRef = useRef(props);
  propsRef.current = props;

  const lastSavedBucketRef = useRef(-1);
  const wasOnBreakRef = useRef(false);
  const [breakPaused, setBreakPaused] = useState(false);
  const breakPausedRef = useRef(breakPaused);
  breakPausedRef.current = breakPaused;

  const selectedNodeId = props.selectedNode?.id ?? null;

  const timerRef = useRef(null);

  useEffect(() => {
    if (!event.isOnBreak || event.isBetweenRounds) {
      setBreakPaused(false);
    }
  }, [event.isOnBreak, event.isBetweenRounds]);

  useEffect(() => {
    const onBreak =
      event.isActive && event.isOnBreak && !event.isBetweenRounds;
    const secondsRemaining = onBreak ? event.breakSeconds : undefined;

    if (onBreak) {
      setTimerPhase({
        phase: 'break',
        secondsRemaining,
        breakPaused: breakPausedRef.current,
      });
    } else if (event.isBetweenRounds) {
      setTimerPhase({
        phase: 'between',
        secondsRemaining: event.betweenRoundSeconds,
        breakPaused: false,
      });
    } else if (event.isTomatoTimerActive) {
      setTimerPhase({
        phase: 'work',
        secondsRemaining: event.tomatoSeconds,
        breakPaused: false,
      });
    } else {
      setTimerPhase({
        phase: 'work',
        secondsRemaining: undefined,
        breakPaused: false,
      });
    }

    if (onBreak && !wasOnBreakRef.current) {
      eventSystem.emit(PLUGIN_EVENTS.TIMER_BREAK_STARTED, {
        secondsRemaining: event.breakSeconds,
      });
    } else if (!onBreak && wasOnBreakRef.current) {
      eventSystem.emit(PLUGIN_EVENTS.TIMER_BREAK_ENDED, {});
    }
    wasOnBreakRef.current = onBreak;
  }, [
    event.isActive,
    event.isOnBreak,
    event.isBetweenRounds,
    event.isTomatoTimerActive,
    event.breakSeconds,
    event.betweenRoundSeconds,
    event.tomatoSeconds,
    breakPaused,
  ]);

  function cycleTomatoTimer() {
    const ev = eventRef.current;
    if (!ev.isActive) {
      return;
    }
    const prefs = getTimerPrefs();
    updateEvent({ tomatoSeconds: (Number(prefs.time) || defaultTimerPreferences.time) * 60 });

    // In between timer and break
    if (!ev.isBetweenRounds && ev.isTomatoTimerActive) {
      showRoundOverNotification();
      updateEvent({ isBetweenRounds: true, betweenRoundSeconds: 5 });

      if (prefs.autoCycle) {
        // TODO: set between rounds time
      }
    }
    // Moving to break
    else if (ev.isBetweenRounds && ev.isTomatoTimerActive) {
      const breakMinutes =
        ev.tomatoTimerRound < 4 ? prefs.shortBreak : prefs.longBreak;
      showBreakStartingNotification(breakMinutes);
      updateEvent({
        isBetweenRounds: false,
        isTomatoTimerActive: false,
        isOnBreak: true,
        breakSeconds: breakMinutes * 60,
      });
    }
    // Between break and new tomato timer
    else if (!ev.isBetweenRounds && ev.isOnBreak) {
      showBreakOverNotification();
      updateEvent({ isBetweenRounds: true, betweenRoundSeconds: 5 });

      if (prefs.autoCycle) {
        // TODO: set between rounds time
      }
    }
    // Move to new tomato round
    else if (ev.isBetweenRounds && ev.isOnBreak) {
      const nextRound =
        ev.tomatoTimerRound < 4 ? ev.tomatoTimerRound + 1 : 1;
      const workMinutes = Number(prefs.time) || defaultTimerPreferences.time;
      showWorkStartingNotification(nextRound, workMinutes);
      updateEvent({
        isBetweenRounds: false,
        isOnBreak: false,
        isTomatoTimerActive: true,
        tomatoTimerRound: nextRound,
        tomatoSeconds: workMinutes * 60,
      });
    }
  }

  function skipBreakEarly() {
    const ev = eventRef.current;
    if (!ev.isOnBreak || ev.isBetweenRounds) {
      return;
    }
    const prefs = getTimerPrefs();
    const nextRound = ev.tomatoTimerRound < 4 ? ev.tomatoTimerRound + 1 : 1;
    const workMinutes = Number(prefs.time) || defaultTimerPreferences.time;
    showBreakOverNotification();
    updateEvent({
      isBetweenRounds: false,
      isOnBreak: false,
      isTomatoTimerActive: true,
      isActive: true,
      tomatoTimerRound: nextRound,
      tomatoSeconds: workMinutes * 60,
    });
    setBreakPaused(false);
    const t = timerRef.current;
    if (t && !t.isRunning()) {
      t.start();
    }
  }

  const timer = useTimer({
    delay: 1000,
    callback: () => {
      const { saveTime, seconds, selectedNode, updateSeconds } = propsRef.current;
      const ev = eventRef.current;

      if (ev.betweenRoundSeconds <= 0 && ev.isBetweenRounds) {
        cycleTomatoTimer();
        return;
      }
      if (
        (ev.tomatoSeconds <= 0 && ev.isTomatoTimerActive) ||
        (ev.breakSeconds <= 0 && ev.isOnBreak && !ev.isBetweenRounds)
      ) {
        cycleTomatoTimer();
        return;
      }

      const isTomatoWorkPhase =
        ev.isTomatoTimerActive && !ev.isOnBreak && !ev.isBetweenRounds;

      const tickTaskTime = () => {
        const nextSeconds = propsRef.current.seconds + 1;
        updateSeconds(nextSeconds);
        if (selectedNode && nextSeconds > 0 && nextSeconds % 10 === 0) {
          const bucket = nextSeconds / 10;
          if (bucket !== lastSavedBucketRef.current) {
            lastSavedBucketRef.current = bucket;
            queueMicrotask(() => saveTime(nextSeconds));
          }
        }
      };

      if (isTomatoWorkPhase) {
        updateEvent({ tomatoSeconds: ev.tomatoSeconds - 1 });
        tickTaskTime();
      }
      if (ev.isOnBreak && !ev.isBetweenRounds && !breakPausedRef.current) {
        updateEvent({ breakSeconds: ev.breakSeconds - 1 });
      }
      if (ev.isBetweenRounds && ev.timerPreferences?.autoCycle) {
        updateEvent({ betweenRoundSeconds: ev.betweenRoundSeconds - 1 });
      }
      if (!ev.isOnBreak && !ev.isBetweenRounds && !ev.isTomatoTimerActive) {
        tickTaskTime();
      }
    },
  });
  timerRef.current = timer;

  useEffect(() => {
    registerTimerControls({
      pauseBreak: () => setBreakPaused(true),
      resumeBreak: () => setBreakPaused(false),
      isBreakPaused: () => breakPausedRef.current,
      skipBreak: skipBreakEarly,
    });
  }, []);

  const toggle = async () => {
    const { endSession, seconds, selectedNode, startSession } = props;
    if (timer.isRunning()) {
      timer.stop();
      if (selectedNode) {
        try {
          endSession(seconds);
        } catch (error) {
          console.error('[Timer] Error ending session:', error);
        }
      }
    } else {
      if (selectedNode) {
        try {
          await startSession(seconds);
        } catch (error) {
          console.error('[Timer] Error starting session:', error);
        }
      }
      timer.start();
    }
    updateEvent({ isActive: !eventRef.current.isActive });
  };

  function getTimerPrefs() {
    return normalizeTimerPreferences(
      propsRef.current.timerPreferences || eventRef.current.timerPreferences,
    );
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
    const prefs = getTimerPrefs();
    const workMinutes = Number(prefs.time) || defaultTimerPreferences.time;
    updateEvent({
      isTomatoTimerActive: true,
      isOnBreak: false,
      isBetweenRounds: false,
      tomatoTimerRound: 1,
      tomatoSeconds: workMinutes * 60,
    });
  }

  useEffect(() => {
    lastSavedBucketRef.current = -1;
    timer.stop();
    updateEvent({ isActive: false });
  }, [selectedNodeId]);
  useEffect(() => {
    updateEvent({
      timerPreferences: normalizeTimerPreferences(props.timerPreferences),
    });
  }, [props.timerPreferences]);

  async function handleTomatoTimerButtonClick() {
    if (!event.isActive) {
      await toggle();
      toggleTomatoTimer();
    } else {
      toggleTomatoTimer();
    }
  }

  function handleAutoCycleChange(checked) {
    const prefs = getTimerPrefs();
    updateEvent({
      timerPreferences: { ...prefs, autoCycle: checked },
    });
    const { updateTimerPreferenceProperty } = propsRef.current;
    if (updateTimerPreferenceProperty) {
      updateTimerPreferenceProperty('autoCycle', checked);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-shadow
  function getTimeLeft(event) {
    let secondsLeft = 0;

    if (
      event.isActive &&
      !event.isOnBreak &&
      !event.isBetweenRounds &&
      event.isTomatoTimerActive
    ) {
      secondsLeft = event.tomatoSeconds;
    } else if (event.isOnBreak && !event.isBetweenRounds) {
      secondsLeft = event.breakSeconds;
    } else if (event.isActive) {
      secondsLeft = event.betweenRoundSeconds;
    }

    return formatDuration(secondsLeft);
  }

  function handlePlayButtonClick() {
    // eslint-disable-next-line no-unused-expressions
    event.isActive && !event.isBetweenRounds
      ? toggle()
      : event.isBetweenRounds
        ? cycleTomatoTimer()
        : toggle();
  }
  const { seconds } = props;

  const tomatoTooltip = event.timerPreferences
    ? `Work: ${event.timerPreferences.time}m · Short break: ${event.timerPreferences.shortBreak}m · Long break: ${event.timerPreferences.longBreak}m${event.timerPreferences.autoCycle ? ' · Auto cycle on' : ''}`
    : 'Configure durations in Project Settings → Tomato Timer';

  const isTomatoRunning =
    (event.isOnBreak || event.isBetweenRounds || event.isTomatoTimerActive) &&
    event.isActive;

  const showTomatoPanel = isTomatoRunning;

  let displaySeconds = seconds ?? 0;
  if (showTomatoPanel) {
    if (event.isTomatoTimerActive && !event.isOnBreak && !event.isBetweenRounds) {
      displaySeconds = event.tomatoSeconds;
    } else if (event.isOnBreak && !event.isBetweenRounds) {
      displaySeconds = event.breakSeconds;
    } else if (event.isBetweenRounds) {
      displaySeconds = event.betweenRoundSeconds;
    }
  }

  return (
    <>
      {showTomatoPanel && (
          <div
            className="time tomato-status"
            style={{
              fontSize: '12px',
              textAlign: 'center',
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-around',
              padding: '4px 0',
              marginBottom: '4px',
            }}
          >
            <div>Round: {event.tomatoTimerRound}</div>
            <div>
              {event.isTomatoTimerActive && !event.isOnBreak && !event.isBetweenRounds ? (
                <div>Tomato Time Active</div>
              ) : event.isOnBreak && !event.isBetweenRounds ? (
                <div>On Break</div>
              ) : (
                <div>Between Rounds</div>
              )}
            </div>
            <div>Time left: {getTimeLeft(event)}</div>
            <div>Total: {formatDuration(seconds)}</div>
          </div>
        )}
      <div
        className="time"
        style={{
          fontSize: '60px',
          textAlign: 'center',
          width: '100%',
          overflow: 'hidden',
          marginTop: showTomatoPanel ? '0' : '-15px',
        }}
      >
        {formatDuration(displaySeconds)}
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
          onClick={() => {
            handlePlayButtonClick();
          }}
        >
          {event.isActive && !event.isBetweenRounds ? (
            <PauseOutlined />
          ) : event.isBetweenRounds ? (
            <StepForwardOutlined />
          ) : (
            <CaretRightOutlined />
          )}
        </Button>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Tooltip title={tomatoTooltip}>
            <Button
              className="button button-primary"
              onClick={handleTomatoTimerButtonClick}
              style={{
                backgroundColor: isTomatoRunning ? '#d4a574' : '#ec8e8e',
                color: 'black',
              }}
            >
              {isTomatoRunning ? 'Stop Tomato' : 'Tomato Timer'}
            </Button>
          </Tooltip>
          {isTomatoRunning && (
            <Tag.CheckableTag
              checked={Boolean(getTimerPrefs().autoCycle)}
              onChange={handleAutoCycleChange}
              style={{
                margin: 0,
                padding: '2px 8px',
                fontSize: 12,
                lineHeight: '20px',
                borderRadius: 12,
              }}
            >
              Auto cycle
            </Tag.CheckableTag>
          )}
        </div>
      </div>
    </>
  );
}

export default Timer;

Timer.propTypes = {
  endSession: PropTypes.func.isRequired,
  saveTime: PropTypes.func.isRequired, // (seconds: number) => void
  seconds: PropTypes.number.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  selectedNode: PropTypes.object, // Allow null/undefined
  startSession: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  timerPreferences: PropTypes.object,
  updateSeconds: PropTypes.func.isRequired,
  updateTimerPreferenceProperty: PropTypes.func,
};
