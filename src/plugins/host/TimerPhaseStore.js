/** In-memory tomato timer phase for plugins (timer webview). */

const listeners = new Set();

let phaseState = {
  phase: 'work',
  secondsRemaining: undefined,
};

export function getTimerPhase() {
  return { ...phaseState };
}

export function setTimerPhase(next) {
  phaseState = { ...phaseState, ...next };
  listeners.forEach((fn) => {
    try {
      fn(getTimerPhase());
    } catch (err) {
      console.error('[TimerPhaseStore] listener error:', err);
    }
  });
}

export function subscribeTimerPhase(handler) {
  listeners.add(handler);
  handler(getTimerPhase());
  return () => listeners.delete(handler);
}
