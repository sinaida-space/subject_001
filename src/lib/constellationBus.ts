// Tiny pub/sub connecting the Signal Map graph and its Plain Signal index, both ways:
//  · highlight(id)  — an index row is hovered → light up its node
//  · focusWork(id)  — a project star or index row is clicked → open its detail popup

type Listener = (id: string | null) => void;
/** viewport box of the control a card opens from (the index row's lines) */
export type FocusOrigin = { left: number; top: number; width: number; height: number; el?: Element };
type FocusListener = (id: string | null, viaDive?: boolean, origin?: FocusOrigin) => void;

const highlightListeners = new Set<Listener>();
const focusListeners = new Set<FocusListener>();

export const constellationBus = {
  // list → constellation
  highlight(id: string | null) {
    highlightListeners.forEach((l) => l(id));
  },
  subscribe(l: Listener) {
    highlightListeners.add(l);
    return () => {
      highlightListeners.delete(l);
    };
  },

  // constellation → selected works
  focusWork(id: string, viaDive = false, origin?: FocusOrigin) {
    focusListeners.forEach((l) => l(id, viaDive, origin));
  },
  subscribeFocus(l: FocusListener) {
    focusListeners.add(l);
    return () => {
      focusListeners.delete(l);
    };
  },
};
