import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@banflow-plugin/pomoranch": path.resolve(
        __dirname,
        "../../../banFlowPlugins/PomoRanch/src/index.ts",
      ),
      "banflow-plugin-api": path.resolve(
        __dirname,
        "../../../banFlowPlugins/banflow-plugin-api/src/index.ts",
      ),
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
