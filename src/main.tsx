import { createRoot, hydrateRoot } from "react-dom/client";
// Must be evaluated before render: it reads the static shell React replaces.
import "./lib/staticShell";
import App from "./App.tsx";
import { hydration } from "./lib/hydration";
import { routeChunks } from "./lib/routeChunks";
import "./index.css";
import { startSmoothScroll } from "./lib/smoothScroll";

// A reload starts at the top, so the hero → About gate plays from its start
// instead of the browser restoring the old offset deep in the page. Route
// changes already reset scroll (App's ScrollToTop) and hash links scroll
// themselves (Index), so nothing relies on the browser's restoration.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

// wheel and trackpad scroll eased in step with the effects (desktop only)
startSmoothScroll();

// Case pages, Practice, Collaborate and Statement arrive rendered at build
// time. React adopts that markup instead of replacing it, so what is
// already on screen stays the LCP element. The page's chunk is loaded first
// and passed in directly, so hydration never suspends on it. The markup's
// mode is the one html[data-mode] names: case pages are always full, and on
// Statement an inline script has already put the matching render in #root
// (scripts/prerender-shell.mjs), or emptied it where the page is drawn by
// the client alone. ?depth=2 renders the case's process floor, which the
// build-time render (always depth 1) does not contain.
const root = document.getElementById("root")!;
const path = location.pathname.replace(/\/+$/, "");
const isCase = /^\/work\/[^/.]+$/.test(path) && !new URLSearchParams(location.search).has("depth");
const isStatement = path === "/statement";
// Practice and Collaborate hydrate like case pages, always full.
const fullPage = isCase ? "work" : /^\/practice(\/[^/.]+)?$/.test(path) ? "practice" : path === "/collaborate" ? "collaborate" : null;
if ((fullPage || isStatement) && root.firstElementChild) {
  const mode = fullPage ? "full" : document.documentElement.getAttribute("data-mode") === "lite" ? "lite" : "full";
  const chunk = fullPage ? routeChunks[fullPage]() : routeChunks.statement();
  chunk.then(({ default: Page }) => {
    hydration.active = true;
    hydrateRoot(root, <App hydrate={mode} pages={{ [fullPage ?? "statement"]: Page }} />);
  });
} else {
  createRoot(root).render(<App />);
}

// Easter egg hint for anyone who opens devtools. Printed once per load.
const TEXT = "color:#d8d8d8;font:13px/1.6 monospace";
console.log(
  "%c♥ SINAIDA_OS%c\n\nhey, smart one.\nglad you're an explorer.\n\nthere are a few easter eggs hidden on this website.\ngo find them.\n\nthe human behind them lives at /humans.txt\n\nstill here? good. what are you after?\ntype a word and press enter:\n\n  human      the person\n  eggs       a hint, just one\n  contact    the door\n  playlist   the soundtrack\n\n%cbuild " + (typeof __BUILD__ === "undefined" ? "dev" : __BUILD__) + " · design and agentic coding by sinaida krivchenko",
  "color:#ff0a0a;font:700 14px monospace;letter-spacing:.3em;text-shadow:0 0 8px #ff0a0a",
  TEXT,
  "color:#777;font:11px/1.6 monospace",
);

// The words above, typed bare into the console: each is a getter on window,
// so no brackets are needed. `human` prints public/humans.txt verbatim (read
// at build time, see vite.config.ts); the getters return nothing on purpose.
let hinted = false;
const say = (text: string) => console.log("%c" + text, TEXT);
const commands: Record<string, () => void> = {
  human: () => say(__HUMANS__),
  eggs: () => {
    say(hinted ? "one hint. that was the deal." : "the heartbeat in the logo likes to be clicked.");
    hinted = true;
  },
  contact: () => say("the door: https://sinaida.eu/#contact"),
  playlist: () => say("the soundtrack: https://open.spotify.com/playlist/2Hs1OUJppCUNZRxZh5bppa"),
};
for (const [name, run] of Object.entries(commands)) {
  if (!(name in window)) Object.defineProperty(window, name, { get: run, configurable: true });
}

/*! Je suis le spectre d'une rose que tu portais hier au bal. Théophile Gautier, 1837 */
