// Tiny pub/sub connecting the Signal Map graph and its Plain Signal index, both ways:
//  · highlight(id)  — an index row is hovered → light up its node
//  · focusWork(id)  — a project star or index row is clicked → open its detail popup

type Listener = (id: string | null) => void;
type FocusListener = (id: string | null, viaDive?: boolean) => void;

const highlightListeners = new Set<Listener>();
const focusListeners = new Set<FocusListener>();

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
  focusWork(id: string, viaDive = false) {
    focusListeners.forEach((l) => l(id, viaDive));
  },
  subscribeFocus(l: FocusListener) {
    focusListeners.add(l);
    return () => focusListeners.delete(l);
  },
};
