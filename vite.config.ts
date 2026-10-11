import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";

// The build's date and commit, printed in the console easter egg.
const commit = (() => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "local";
  }
})();
const BUILD = `${new Date().toISOString().slice(2, 10).replace(/-/g, ".")} · ${commit}`;

// The Licensing page's "Last updated" is the date of the last commit that
// touched it. Falls back to today when git history is unavailable.
const LICENSING_UPDATED = (() => {
  try {
    const iso = execSync("git log -1 --format=%cI -- src/pages/Licensing.tsx").toString().trim();
    if (iso) return iso.slice(0, 10);
  } catch {
    /* no git */
  }
  return new Date().toISOString().slice(0, 10);
})();

export default defineConfig(() => ({
  base: "/",
  define: {
    __BUILD__: JSON.stringify(BUILD),
    __LICENSING_UPDATED__: JSON.stringify(LICENSING_UPDATED),
  },
  server: {
    host: "::",
    port: Number(process.env.PORT) || 8080,
    hmr: { overlay: false },
  },
  // No maps in production: dist/ is deployed as-is, so any .map file would be
  // public. Run `vite build --sourcemap` locally when a map is needed.
  build: { sourcemap: false },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "three", "@react-three/fiber", "@react-three/drei"],
  },
}));
