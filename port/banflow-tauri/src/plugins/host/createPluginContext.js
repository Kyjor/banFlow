import { tauriInvoke } from '../../utils/tauri';
import eventSystem from '../../services/EventSystem';
import { createBreakSurfaceSession } from './KaplayBreakSurfaceAdapter';
import { getTimerPhase, subscribeTimerPhase } from './TimerPhaseStore';
import { getTimerControls } from './timerBridge';

/**
 * @param {string} pluginId
 * @param {{ registerTimerBreakView: (c: import('react').ComponentType) => void }} uiRegistry
 * @returns {import('banflow-plugin-api').PluginContext}
 */
export function createPluginContext(pluginId, uiRegistry) {
  return {
    pluginId,
    events: {
      on(event, handler) {
        return eventSystem.on(event, handler);
      },
    },
    storage: {
      async get() {
        const data = await tauriInvoke('plugin_storage_get', { pluginId });
        return data ?? null;
      },
      async set(data) {
        await tauriInvoke('plugin_storage_set', { pluginId, data });
      },
    },
    timer: {
      subscribePhase(handler) {
        return subscribeTimerPhase(handler);
      },
      getPhase() {
        return getTimerPhase();
      },
      getTaskInfo() {
        const info = getTimerControls().getTaskInfo();
        return info ?? null;
      },
      pauseBreak() {
        getTimerControls().pauseBreak();
      },
      resumeBreak() {
        getTimerControls().resumeBreak();
      },
      isBreakPaused() {
        return getTimerControls().isBreakPaused();
      },
      skipBreak() {
        getTimerControls().skipBreak();
      },
    },
    projects: {
      current() {
        return localStorage.getItem('currentProject');
      },
    },
    ui: {
      registerTimerBreakView(component) {
        uiRegistry.registerTimerBreakView(component);
      },
    },
    breakSurface: {
      createSession(opts) {
        return createBreakSurfaceSession(opts);
      },
    },
  };
}
