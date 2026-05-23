import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Optional sibling-repo plugins: import id -> folder under banFlowPlugins */
const OPTIONAL_PLUGINS: Record<string, string> = {
  pomoranch: "PomoRanch",
};

const OPTIONAL_PLUGIN_STUB = "\0banflow-optional-plugin-stub";

function optionalBanflowPlugins(pluginsRoot: string): Plugin {
  return {
    name: "banflow-optional-plugins",
    resolveId(id) {
      if (!id.startsWith("@banflow-plugin/")) return;
      const pluginId = id.slice("@banflow-plugin/".length);
      const folder = OPTIONAL_PLUGINS[pluginId];
      if (!folder) return OPTIONAL_PLUGIN_STUB;

      const entry = path.join(pluginsRoot, folder, "src/index.ts");
      return fs.existsSync(entry) ? entry : OPTIONAL_PLUGIN_STUB;
    },
    load(id) {
      if (id === OPTIONAL_PLUGIN_STUB) return "export default null;";
    },
  };
}

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const pluginsRoot = path.resolve(__dirname, "../../../banFlowPlugins");
const pluginApiEntry = path.join(pluginsRoot, "banflow-plugin-api/src/index.ts");

export default defineConfig(async () => ({
  plugins: [react(), optionalBanflowPlugins(pluginsRoot)],
  resolve: {
    alias: {
      ...(fs.existsSync(pluginApiEntry)
        ? { "banflow-plugin-api": pluginApiEntry }
        : {}),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  define: { global: "globalThis" },
}));
