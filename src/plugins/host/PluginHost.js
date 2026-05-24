import { createPluginContext } from './createPluginContext';
import { notifyUi } from './ui/pluginUiRegistry';

const timerBreakViews = new Set();
const listeners = new Set();

/** Plugin import id -> loader (lazy; do not static-import plugins — blocks HostAiButton). */
const PLUGIN_LOADERS = {
  pomoranch: () => import('@banflow-plugin/pomoranch'),
  'ai-assistant': () => import('@banflow-plugin/ai-assistant'),
};

const PLUGIN_LOAD_ORDER = ['pomoranch', 'ai-assistant'];

let initPromise = null;

function loadEnabledPlugins() {
  try {
    const raw = localStorage.getItem('banflowEnabledPlugins');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isPluginEnabled(importId) {
  const enabled = loadEnabledPlugins();
  if (!enabled) return true;
  return enabled[importId] !== false;
}

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
    const ctx = createPluginContext(
      plugin.manifest.id,
      uiRegistry,
      plugin.manifest.permissions || [],
    );
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

  async loadPlugin(importId) {
    const loader = PLUGIN_LOADERS[importId];
    if (!loader) {
      console.warn(`[PluginHost] Unknown plugin id: ${importId}`);
      return false;
    }

    if (active.some(({ plugin }) => plugin.manifest.id === importId)) {
      return true;
    }

    try {
      const mod = await loader();
      const plugin = mod.default ?? mod;
      if (plugin?.manifest && plugin.activate) {
        await this.activate(plugin);
        notifyUi();
        return true;
      }
      console.info(`[PluginHost] ${importId} not available (empty or invalid export)`);
      return false;
    } catch (err) {
      console.warn(`[PluginHost] Failed to load ${importId}:`, err);
      return false;
    }
  }

  async init() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      if (this.initialized) return;
      this.initialized = true;

      const enablePlugins =
        import.meta.env.VITE_ENABLE_PLUGINS === 'true' || import.meta.env.DEV;

      if (!enablePlugins) {
        console.info('[PluginHost] plugins disabled (set VITE_ENABLE_PLUGINS=true)');
        return;
      }

      for (const id of PLUGIN_LOAD_ORDER) {
        if (isPluginEnabled(id)) {
          await this.loadPlugin(id);
        }
      }
      notifyUi();
    })();

    return initPromise;
  }
}

const pluginHost = new PluginHost();
export default pluginHost;
