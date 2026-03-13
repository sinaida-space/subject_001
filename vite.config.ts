import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { PrerenderSPAPlugin, PuppeteerRenderer } from "vite-plugin-prerender";

export default defineConfig(({ mode }) => ({
  base: "/subject_001/",
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && PrerenderSPAPlugin({
      routes: ["/"],
      renderer: new PuppeteerRenderer({
        renderAfterTime: 3000,
      }),
    }),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "three", "@react-three/fiber", "@react-three/drei"],
  },
}));