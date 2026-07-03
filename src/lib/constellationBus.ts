// Tiny pub/sub connecting the Signal Map graph and its Plain Signal index, both ways:
//  · highlight(id)  — an index row is hovered → light up its node
//  · focusWork(id)  — a project star or index row is clicked → open its detail popup

type Listener = (id: string | null) => void;

const highlightListeners = new Set<Listener>();
const focusListeners = new Set<Listener>();

export const constellationBus = {
  // list → constellation
  highlight(id: string | null) {
    highlightListeners.forEach((l) => l(id));
  },
  subscribe(l: Listener) {
    highlightListeners.add(l);
    return () => highlightListeners.delete(l);
  },

  // constellation → selected works
  focusWork(id: string) {
    focusListeners.forEach((l) => l(id));
  },
  subscribeFocus(l: Listener) {
    focusListeners.add(l);
    return () => focusListeners.delete(l);
  },
};
