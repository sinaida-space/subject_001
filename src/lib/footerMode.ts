// ── How the footer's camera moves (2026-10-24) ──
// The footer's dolly and lowered eyes (#179) have a second move, the default:
// ?footer=dive (the head turns straight down onto the city, a night map seen
// from above). ?footer=current is the footer as it was. Like ?stars= the
// pick holds for the tab. Each is a pure function of the footer's progress
// f: scrolling back plays it in reverse, nothing moves at rest. Home page
// only; the other pages keep the current footer.

import { CITY, cityCamera, smoother, span } from '@/lib/city';

export type FooterMode = 'current' | 'dive';
const MODES: FooterMode[] = ['current', 'dive'];
const KEY = 'sinaida:footer';
const isMode = (m: string | null): m is FooterMode => !!m && (MODES as string[]).includes(m);

function read(): FooterMode {
  if (typeof window === 'undefined') return 'dive';
  const asked = new URLSearchParams(window.location.search).get('footer');
  try {
    if (isMode(asked)) sessionStorage.setItem(KEY, asked);
    const kept = sessionStorage.getItem(KEY);
    if (isMode(kept)) return kept;
  } catch {
    if (isMode(asked)) return asked;
  }
  return 'dive';
}

export const FOOTER_MODE = read();

// ── timing, all in f
export const MODE_TIMING = {
  // dive: the head turns down and the camera rises over the same stretch, so
  // it reads as one arc; the lights come on from under the feet outward
  // (2026-10-24) the lights pour down from above the camera while the head
  // turns, so the frame is never empty halfway down
  dive: { turn: [0.12, 0.8] as const, fall: [0.15, 0.7] as const, ground: [0.06, 0.75] as const },
};

/** dive: how high above the ground the camera looks down from */
export const DIVE_HEIGHT = 6.5;
/** dive: the city's middle lies this far ahead of the end pose, so the
 * lights lie all round the point the camera looks down on */
export const DIVE_OVER = 9;
const DIVE_FOV = 50;

export interface FooterCamera {
  dy: number;
  dz: number;
  pitch: number;
  fall: number;
  fov: number;
  /** dive: 0..1 how far the star box has slid to sit round the camera */
  slide: number;
  /** 0..1 how far the city's lights are on */
  ground: number;
}

const still = { slide: 0 };

/** the camera's offset from the flight's end pose at progress f, per mode;
 * `groundDrop` is how far under the end eye height the ground lies */
export function footerCamera(mode: FooterMode, f: number, horizon?: number, groundDrop = 2.9): FooterCamera {
  if (mode === 'dive') {
    const t = MODE_TIMING.dive;
    const k = smoother(span(f, t.turn));
    return {
      ...still,
      // rise from the eye height to DIVE_HEIGHT over the ground
      dy: (DIVE_HEIGHT - groundDrop) * k,
      dz: 0,
      pitch: (-Math.PI / 2) * k,
      fall: smoother(span(f, t.fall)),
      fov: 60 + (DIVE_FOV - 60) * k,
      slide: k,
      ground: span(f, t.ground),
    };
  }
  return { ...cityCamera(f, horizon), ...still, ground: span(f, CITY.ground) };
}

/** where the city's middle lies relative to current's (along z, world units) */
export function cityShiftZ(mode: FooterMode, dollyZ: number) {
  if (mode === 'dive') return DIVE_OVER - dollyZ;
  return 0;
}

// Je suis le spectre d'une rose que tu portais hier au bal. — Théophile Gautier
