import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Optional sibling-repo plugins: import id -> folder under banFlowPlugins */
const OPTIONAL_PLUGINS: Record<string, string> = {
  pomoranch: "PomoRanch",
  "ai-assistant": "banflow-plugin-ai-assistant",
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

      const candidates = ["src/index.ts", "src/index.tsx", "src/index.jsx"].map(
        (p) => path.join(pluginsRoot, folder, p),
      );
      const entry = candidates.find((p) => fs.existsSync(p));
      return entry ?? OPTIONAL_PLUGIN_STUB;
    },
    load(id) {
      if (id === OPTIONAL_PLUGIN_STUB) return "export default null;";
    },
  };
}

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const pluginsRoot = path.resolve(__dirname, "../banFlowPlugins");
const pluginApiEntry = path.join(pluginsRoot, "banflow-plugin-api/src/index.ts");
const aiAssistantEntry = path.join(
  pluginsRoot,
  "banflow-plugin-ai-assistant/src/index.jsx",
);
const nm = path.resolve(__dirname, "node_modules");

/** Sibling plugins have no local node_modules; resolve peers from banFlow. */
const pluginPeerAliases = {
  react: path.join(nm, "react"),
  "react-dom": path.join(nm, "react-dom"),
  antd: path.join(nm, "antd"),
  "@ant-design/icons": path.join(nm, "@ant-design/icons"),
};

export default defineConfig(async () => ({
  plugins: [react(), optionalBanflowPlugins(pluginsRoot)],
  resolve: {
    alias: {
      ...pluginPeerAliases,
      "@banflow/action-spec": path.resolve(
        __dirname,
        "src/plugins/host/actionSpec.json",
      ),
      ...(fs.existsSync(pluginApiEntry)
        ? { "banflow-plugin-api": pluginApiEntry }
        : {}),
      ...(fs.existsSync(aiAssistantEntry)
        ? { "@banflow-plugin/ai-assistant": aiAssistantEntry }
        : {}),
    },
    dedupe: ["react", "react-dom"],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  define: { global: "globalThis" },
}));
