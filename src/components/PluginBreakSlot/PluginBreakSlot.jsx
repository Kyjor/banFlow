import React, { useEffect, useState } from 'react';
import pluginHost from '../../plugins/host/PluginHost';
import { getTimerPhase, subscribeTimerPhase } from '../../plugins/host/TimerPhaseStore';

/**
 * Renders plugin timer-break UI only during an active pomodoro break.
 */
export default function PluginBreakSlot() {
  const [phase, setPhase] = useState(getTimerPhase);
  const [breakViews, setBreakViews] = useState(() => pluginHost.getTimerBreakViews());

  useEffect(() => subscribeTimerPhase(setPhase), []);
  useEffect(() => pluginHost.subscribeTimerBreakViews(setBreakViews), []);

  const onBreak = phase.phase === 'break';
  if (!onBreak || breakViews.length === 0) {
    return null;
  }

  const View = breakViews[breakViews.length - 1];

  return (
    <div
      style={{
        marginTop: 8,
        maxHeight: '55vh',
        overflow: 'auto',
        borderTop: '1px solid #333',
        paddingTop: 8,
      }}
    >
      <View />
    </div>
  );
}
