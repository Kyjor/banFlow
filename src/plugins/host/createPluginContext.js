import { message as antdMessage } from 'antd';
import { tauriInvoke } from '../../utils/tauri';
import eventSystem from '../../services/EventSystem';
import { createBreakSurfaceSession } from './KaplayBreakSurfaceAdapter';
import { getTimerPhase, subscribeTimerPhase } from './TimerPhaseStore';
import { getTimerControls } from './timerBridge';
import { createPluginActions } from './actions';
import { resolveCurrentProject } from './actions/resolveCurrentProject';
import * as pluginUi from './ui/pluginUiRegistry';

/**
 * @param {string} pluginId
 * @param {{ registerTimerBreakView: (c: import('react').ComponentType) => void }} uiRegistry
 * @returns {import('banflow-plugin-api').PluginContext}
 */
export function createPluginContext(pluginId, uiRegistry, permissions = []) {
  const actions = createPluginActions(pluginId, permissions);

  return {
    pluginId,
    events: {
      on(event, handler) {
        return eventSystem.on(event, handler);
      },
      emit(event, payload) {
        eventSystem.emit(event, payload);
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
        return resolveCurrentProject();
      },
    },
    ui: {
      registerTimerBreakView(component) {
        uiRegistry.registerTimerBreakView(component);
      },
      registerSidebarAction(reg) {
        return pluginUi.registerSidebarAction(reg);
      },
      registerPanel(reg) {
        return pluginUi.registerPanel(reg);
      },
      openModal(opts) {
        return pluginUi.openModal(opts);
      },
      closeModal(id) {
        pluginUi.closeModal(id);
      },
      setPanelOpen(panelId, open) {
        pluginUi.setPanelOpen(panelId, open);
      },
      showActionPreview(proposal, handlers) {
        pluginUi.showActionPreview(proposal, handlers);
        pluginUi.setPanelOpen('ai-assistant-panel', false);
      },
    },
    notifications: {
      toast({ content, type = 'info', duration }) {
        const opts = { content, ...(duration != null ? { duration } : {}) };
        switch (type) {
          case 'success':
            antdMessage.success(opts);
            break;
          case 'warning':
            antdMessage.warning(opts);
            break;
          case 'error':
            antdMessage.error(opts);
            break;
          default:
            antdMessage.info(opts);
        }
      },
    },
    breakSurface: {
      createSession(opts) {
        return createBreakSurfaceSession(opts);
      },
    },
    actions,
    ai: {
      async chat(request) {
        return tauriInvoke('plugin_openrouter_chat', {
          pluginId,
          request,
        });
      },
    },
  };
}
