// ── Case dives (#119): tiny bus between the things that start a dive
// (a constellation node, the DEPTH mark, a thread) and the DiveHost that
// plays it. Callers ask `diveBus.dive(req)`; a false return means no dive
// will run (lite mode, no host mounted), so the caller navigates plainly.

/** where a constellation dive hands over to the detail card: the dialect
 *  effect is fully formed (dither laid, glyphs typed, CRT door half open) */
export const DIVE_LAND_AT = 0.62;

export type Dialect = 'crt' | 'dither' | 'ascii';

export interface DiveRequest {
  /** in-app path to land on, e.g. /work/redkie-ptitsy or /work/x?depth=2 */
  to?: string;
  /** land without a route change: called under the final frame instead of
   *  navigating (the constellation opens its detail card this way) */
  land?: () => void;
  /** where a `land` dive stops, 0..1 of the full dive: the card rises out of
   *  the dialect effect mid-flight instead of after the full-screen image */
  landAt?: number;
  /** reverse a `land` dive: the effect closes over the card, `close` runs
   *  under it, and the camera flies back out into the launching control */
  close?: () => void;
  dialect: Dialect;
  /** key frame the projector throws onto the wall */
  image?: string;
  /** where the beam leaves from, client css px; viewport centre if absent */
  origin?: { x: number; y: number };
  /** names the launching control, so Back can fly into it again:
   *  `node:<id>` (constellation), `depth`, `thread:<id>` */
  anchor: string;
}

/** What a dived-into history entry remembers (React Router location.state). */
export interface DiveState {
  dive: Omit<DiveRequest, 'to' | 'origin' | 'land'>;
}

type Handler = (req: DiveRequest) => boolean;
type Locator = (id: string) => { x: number; y: number } | null;

let handler: Handler | null = null;
let nodeLocator: Locator | null = null;

export const diveBus = {
  dive(req: DiveRequest): boolean {
    return handler ? handler(req) : false;
  },
  setHandler(h: Handler) {
    handler = h;
    return () => {
      if (handler === h) handler = null;
    };
  },
  /** ConstellationFull registers this: node id → its centre, client css px */
  setNodeLocator(l: Locator) {
    nodeLocator = l;
    return () => {
      if (nodeLocator === l) nodeLocator = null;
    };
  },
  locateNode(id: string) {
    return nodeLocator ? nodeLocator(id) : null;
  },
};

export const isDiveState = (s: unknown): s is DiveState =>
  !!s && typeof s === 'object' && 'dive' in s && !!(s as DiveState).dive?.dialect;

// Je suis le spectre d'une rose que tu portais hier au bal.
