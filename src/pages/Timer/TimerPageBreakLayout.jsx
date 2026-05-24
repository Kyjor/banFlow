import React, { useEffect, useState } from 'react';
import { getTimerPhase, subscribeTimerPhase } from '../../plugins/host/TimerPhaseStore';
import { registerTimerControls } from '../../plugins/host/timerBridge';
import TimerBreakTakeover from '../../components/TimerBreakTakeover/TimerBreakTakeover';

const BREAK_WINDOW_BG = '#6eb5e8';

/**
 * Hides tree + timer during break; mounts full-viewport plugin takeover.
 * Timer stays mounted (hidden) so break countdown keeps ticking.
 */
export default function TimerPageBreakLayout({
  getTaskInfo,
  treeDisplay,
  timer,
  lokiLoaded,
  titleBar,
}) {
  const [phase, setPhase] = useState(getTimerPhase);

  useEffect(() => subscribeTimerPhase(setPhase), []);
  useEffect(() => {
    registerTimerControls({ getTaskInfo });
  }, [getTaskInfo]);

  const onBreak = phase.phase === 'break';

  if (!lokiLoaded) {
    return (
      <>
        {titleBar}
        <div style={{ margin: 10 }} />
        <div>Loading...</div>
      </>
    );
  }

  return (
    <>
      {titleBar}
      <div
        className="app"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          background: onBreak ? BREAK_WINDOW_BG : undefined,
        }}
      >
        <div style={{ display: onBreak ? 'none' : 'block' }}>{treeDisplay}</div>
        <div style={{ display: onBreak ? 'none' : 'block' }}>{timer}</div>
        {onBreak && <TimerBreakTakeover />}
      </div>
    </>
  );
}
