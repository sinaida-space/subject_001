import { createRoot } from "react-dom/client";
// Must be evaluated before render: it reads the static shell React replaces.
import "./lib/staticShell";
import App from "./App.tsx";
import "./index.css";

// A reload starts at the top, so the hero → About gate plays from its start
// instead of the browser restoring the old offset deep in the page. Route
// changes already reset scroll (App's ScrollToTop) and hash links scroll
// themselves (Index), so nothing relies on the browser's restoration.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

createRoot(document.getElementById("root")!).render(<App />);

// Easter egg hint for anyone who opens devtools. Printed once per load.
const TEXT = "color:#d8d8d8;font:13px/1.6 monospace";
console.log(
  "%c♥ SINAIDA_OS%c\n\nhey, smart one.\nglad you're an explorer.\n\nthere are a few easter eggs hidden on this website.\ngo find them.\n\nthe human behind them lives at /humans.txt\n\nstill here? good. what are you after?\ntype a word and press enter:\n\n  human      the person\n  eggs       a hint, just one\n  contact    the door\n  playlist   the soundtrack\n\n%cbuild " + (typeof __BUILD__ === "undefined" ? "dev" : __BUILD__) + " · designed and coded by sinaida krivchenko",
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
