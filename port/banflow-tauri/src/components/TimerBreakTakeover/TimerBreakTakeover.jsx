import React, { useEffect, useState } from 'react';
import pluginHost from '../../plugins/host/PluginHost';
import { getTimerPhase, subscribeTimerPhase } from '../../plugins/host/TimerPhaseStore';

const BREAK_BG = '#6eb5e8';

/**
 * Full timer-window takeover during pomodoro break (plugin game + HUD).
 */
export default function TimerBreakTakeover() {
  const [phase, setPhase] = useState(getTimerPhase);
  const [breakViews, setBreakViews] = useState(() => pluginHost.getTimerBreakViews());

  useEffect(() => subscribeTimerPhase(setPhase), []);
  useEffect(() => pluginHost.subscribeTimerBreakViews(setBreakViews), []);

  if (phase.phase !== 'break' || breakViews.length === 0) {
    return null;
  }

  const View = breakViews[breakViews.length - 1];

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: BREAK_BG,
      }}
    >
      <View />
    </div>
  );
}
