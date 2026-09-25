import { createRoot } from "react-dom/client";
// Must be evaluated before render: it reads the static shell React replaces.
import "./lib/staticShell";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Easter egg hint for anyone who opens devtools. Printed once per load.
console.log(
  "%c♥ SINAIDA_OS%c\n\nhey, smart one.\nglad you're an explorer.\n\nthere are a few easter eggs hidden on this website.\ngo find them.\n",
  "color:#ff0a0a;font:700 14px monospace;letter-spacing:.3em;text-shadow:0 0 8px #ff0a0a",
  "color:#d8d8d8;font:13px/1.6 monospace",
);

/*! Je suis le spectre d'une rose que tu portais hier au bal. Théophile Gautier, 1837 */
