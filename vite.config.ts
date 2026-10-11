import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";

// The build's date and commit, printed in the console easter egg.
const commit = (() => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "local";
  }
})();
const BUILD = `${new Date().toISOString().slice(2, 10).replace(/-/g, ".")} · ${commit}`;

export default defineConfig(({ mode }) => ({
  base: "/",
  define: { __BUILD__: JSON.stringify(BUILD) },
  server: {
    host: "::",
    port: Number(process.env.PORT) || 8080,
    hmr: { overlay: false },
  },
  // No maps in production: dist/ is deployed as-is, so any .map file would be
  // public. Run `vite build --sourcemap` locally when a map is needed.
  build: { sourcemap: false },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "three", "@react-three/fiber", "@react-three/drei"],
  },
}));
