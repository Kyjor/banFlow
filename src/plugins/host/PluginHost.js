import { createPluginContext } from './createPluginContext';

const timerBreakViews = new Set();
const listeners = new Set();

/** @type {Array<{ plugin: import('banflow-plugin-api').BanflowPlugin, ctx: import('banflow-plugin-api').PluginContext }>} */
const active = [];

function notifyBreakViews() {
  const views = [...timerBreakViews];
  listeners.forEach((fn) => fn(views));
}

const uiRegistry = {
  /** @param {import('react').ComponentType} component */
  registerTimerBreakView(component) {
    timerBreakViews.add(component);
    notifyBreakViews();
  },
};

class PluginHost {
  constructor() {
    this.initialized = false;
  }

  getTimerBreakViews() {
    return [...timerBreakViews];
  }

  subscribeTimerBreakViews(handler) {
    handler(this.getTimerBreakViews());
    listeners.add(handler);
    return () => listeners.delete(handler);
  }

  /**
   * @param {import('banflow-plugin-api').BanflowPlugin} plugin
   */
  async activate(plugin) {
    const ctx = createPluginContext(plugin.manifest.id, uiRegistry);
    await plugin.activate(ctx);
    active.push({ plugin, ctx });
    console.info(`[PluginHost] activated ${plugin.manifest.id}`);
  }

  async deactivateAll() {
    while (active.length) {
      const { plugin, ctx } = active.pop();
      timerBreakViews.clear();
      notifyBreakViews();
      if (plugin.deactivate) {
        await plugin.deactivate(ctx);
      }
    }
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    const enablePlugins =
      import.meta.env.VITE_ENABLE_PLUGINS === 'true' || import.meta.env.DEV;

    if (!enablePlugins) {
      console.info('[PluginHost] plugins disabled (set VITE_ENABLE_PLUGINS=true)');
      return;
    }

    try {
      const mod = await import('@banflow-plugin/pomoranch');
      const plugin = mod.default ?? mod;
      if (plugin?.manifest && plugin.activate) {
        await this.activate(plugin);
      } else {
        console.info('[PluginHost] PomoRanch not available (optional sibling repo)');
      }
    } catch (err) {
      console.warn('[PluginHost] Failed to activate PomoRanch:', err);
    }
  }
}

const pluginHost = new PluginHost();
export default pluginHost;
