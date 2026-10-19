import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import { readFileSync } from "fs";

// The build stamp printed in the console easter egg: YY.MM.DD.HH.MM in Prague
// time, 24-hour clock, plus the commit. On main the last commit is the merged
// release, so the stamp is the moment of the merge and tells apart several
// releases on one day. Without git it falls back to the time of the build.
const commit = (() => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "local";
  }
})();
const stampDate = (() => {
  try {
    return new Date(execSync("git log -1 --format=%cI").toString().trim());
  } catch {
    return new Date();
  }
})();
const stampParts = Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(stampDate)
    .map((p) => [p.type, p.value]),
);
const BUILD = `${stampParts.year}.${stampParts.month}.${stampParts.day}.${stampParts.hour}.${stampParts.minute} · ${commit}`;

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
    // public/humans.txt, verbatim: the console's `human` and the WebMCP reply print it
    __HUMANS__: JSON.stringify(readFileSync("public/humans.txt", "utf8")),
    __LICENSING_UPDATED__: JSON.stringify(LICENSING_UPDATED),
  },
  server: {
    host: "::",
    port: Number(process.env.PORT) || 8080,
    hmr: { overlay: false },
  },
  // No maps in production: dist/ is deployed as-is, so any .map file would be
  // public. Run `vite build --sourcemap` locally when a map is needed.
  // Targets pinned to the Vite 5 defaults: Vite 8 aims at Safari 16.4+ and
  // rewrites media queries to range syntax, which older iPhones ignore.
  build: {
    sourcemap: false,
    target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "three", "@react-three/fiber", "@react-three/drei"],
  },
}));
