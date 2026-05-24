/** Host bridge: tomato timer ↔ plugins (break pause / skip / task info). */

const noop = () => {};

let controls = {
  pauseBreak: noop,
  resumeBreak: noop,
  skipBreak: noop,
  isBreakPaused: () => false,
  getTaskInfo: () => null,
};

export function registerTimerControls(next) {
  controls = { ...controls, ...next };
}

export function getTimerControls() {
  return controls;
}
