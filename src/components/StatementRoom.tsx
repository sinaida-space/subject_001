import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import StatementLetters, { type LettersHandle } from '@/components/StatementLetters';
import { roomBus, type Box } from '@/lib/roomBus';
import { hydration } from '@/lib/hydration';

// The WebGL room, drawn only from 768px in full mode. Lazy, so phones and
// the hydrated build-time render never wait for three.js.
const StatementScene = lazy(() => import('@/components/StatementScene'));

// The statement as a flight: each paragraph waits a little way ahead, and the
// scroll carries the reader to it, through the scene that StatementScene draws
// behind the text. Desktop and full mode only; elsewhere the paragraphs fall
// back to a plain column. A pure function of scroll; scrolling back flies home.
//
// The story runs in beats, and each beat holds still for a while before the
// scene moves on, so a paragraph can be read in peace:
//
//   0  the title in stars, already coming apart on the first scroll
//   1  the lead, the world written in light
//   2  paragraph 1 over the whole screen, out of the world's light
//   3  paragraph 2, the neuron forming below
//   4  the closing paragraph in the middle, the neuron reaching the circuit
//   5  the cases, built from the same points
//   6  everything scatters back into the sky, towards the contact
//
// Paragraphs after the lead come and go the digital way (StatementLetters):
// they resolve out of random characters and fall apart into a dither.

const DEPTH = 420; // px of CSS travel between two paragraphs
const PERSPECTIVE = 900;
// the beat each paragraph stands on
const SLOTS = [1, 2, 3, 4];
// the paragraph that fills the screen
const ACCENT = 1;
const BEATS = 6;
const CASES = 5;
// vh of scroll per beat
const BEAT_VH = 210;
// how long the move from each beat to the next lasts, in beats: the title
// goes quickly; the story ends standing on the cases, which then scroll away
// with the page into the contact, so there is never an empty sky
const WEIGHTS = [0.7, 2.0, 1, 1, 1, 0.45];
const TOTAL = WEIGHTS.reduce((a, b) => a + b, 0);
/** scroll progress 0..1 to beats, each beat as long as its weight */
function beatsOf(f: number) {
  let d = f * TOTAL;
  for (let k = 0; k < BEATS; k++) {
    const w = WEIGHTS[k] ?? 1;
    if (d <= w) return k + d / w;
    d -= w;
  }
  return BEATS;
}
// share of each beat that holds still: the paragraph stands, the scene rests;
// the rest of the beat is the move to the next one
const HOLD = 0.55;
// the title does not wait: the first scroll already starts the move
const TITLE_HOLD = 0;
// the world holds only briefly: most of its beat is the flare and the flight
// through it, slow enough to watch the shell open
const LEAD_HOLD = 0.22;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (x: number) => x * x * (3 - 2 * x);

/** scroll (in beats) to story time: each beat holds on its whole number, then
 * moves to the next one; the text and the scene both follow story time */
function story(raw: number) {
  const k = Math.floor(raw);
  if (k >= BEATS) return BEATS;
  // the last move, into the sky, has nothing to hold
  const hold = k === 0 ? TITLE_HOLD : k === 1 ? LEAD_HOLD : k === BEATS - 1 ? 1 : HOLD;
  return k + smooth(clamp((raw - k - hold) / (1 - hold)));
}

/** paragraph 1 in its parts, all driven as one */
function AccentParts({ parts, className, mark, gather, refs }: { parts: string[]; className: string; mark?: string; gather?: string[][]; refs: (h: LettersHandle | null) => void }) {
  const each = useRef<(LettersHandle | null)[]>([]);
  useEffect(() => {
    refs({ set: (enter, leave) => each.current.forEach((h, k) => h?.set(enter, clamp(leave * 1.3 - k * 0.15))) });
    return () => refs(null);
  }, [refs]);
  return (
    <div className="space-y-[0.7em]">
      {parts.map((t, k) => (
        <StatementLetters key={k} ref={(h) => (each.current[k] = h)} text={t} className={className} mark={mark} from="light" gather={gather?.[k]} />
      ))}
    </div>
  );
}

const boxOf = (el: Element, origin: DOMRect): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
};

export default function StatementRoom({
  blocks,
  bodyClass,
  leadClass,
  accentClass,
  closingClass,
  accentParts,
  accentMark,
  accentGather,
  gather,
  finale,
}: {
  blocks: string[];
  bodyClass: string;
  /** class for the first and the last paragraph, which read larger */
  leadClass?: string;
  /** class for the paragraph that fills the screen */
  accentClass?: string;
  /** class for the closing paragraph, centred as the statement's highlight */
  closingClass?: string;
  /** paragraph 1 in short parts, as it shows on the whole screen */
  accentParts?: string[];
  /** words each part of paragraph 1 gathers from its falling letters */
  accentGather?: string[][];
  /** the same for the other paragraphs, by their index in blocks */
  gather?: Record<number, string[]>;
  /** a phrase in paragraph 1 that glints */
  accentMark?: string;
  /** what the closing paragraph turns into: the cases */
  finale?: ReactNode;
}) {
  // narrow while hydrating: the build-time render is the phone layout, and
  // a wide screen in full mode never hydrates it (scripts/prerender-shell.mjs)
  const [wide, setWide] = useState(() => !hydration.active && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const letterRefs = useRef<(LettersHandle | null)[]>([]);
  const last = blocks.length - 1;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // where the cases stand, for the scene to draw them in points
  useEffect(() => {
    if (!wide) return;
    const measure = () => {
      const stage = stageRef.current;
      const track = trackRef.current;
      if (!stage || !track) return;
      // measured as if stuck: the stage is the screen
      const origin = stage.getBoundingClientRect();
      const closing = nodeRefs.current[last]?.querySelector('p');
      if (closing) roomBus.textBottom = boxOf(closing, origin).y + closing.getBoundingClientRect().height;
      roomBus.tiles = finaleRef.current ? [...finaleRef.current.querySelectorAll('[data-room-tile]')].map((el) => boxOf(el, origin)) : [];
      // the star title sits just under the Back link, where the page begins
      roomBus.titleY = track.getBoundingClientRect().top + window.scrollY + 20;
      roomBus.ready = true;
      roomBus.emit();
    };
    document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [wide, last]);

  useEffect(() => {
    if (!wide) return;
    roomBus.beats = BEATS;
    let raf = 0;
    const frame = () => {
      raf = 0;
      const track = trackRef.current;
      if (!track) return;
      const r = track.getBoundingClientRect();
      // the story starts with the page's first scroll, not when the room
      // reaches the top: the title comes apart as the Back link leaves
      const end = Math.max(1, r.bottom + window.scrollY - window.innerHeight);
      const raw = beatsOf(clamp(window.scrollY / end));
      const beat = story(raw);
      const visible = r.top < window.innerHeight && r.bottom > 0;
      if (raw !== roomBus.raw || visible !== roomBus.visible) {
        roomBus.beat = beat;
        roomBus.raw = raw;
        roomBus.visible = visible;
        roomBus.emit();
      }
      nodeRefs.current.forEach((el, i) => {
        if (!el) return;
        const slot = SLOTS[i] ?? i + 1;
        let o = 1;
        if (i === 0) {
          // the lead flies in and past, d: 0 in focus, negative ahead, positive passed
          const d = (beat - slot) * DEPTH;
          const ahead = clamp(1 + d / (DEPTH * 0.6));
          const behind = clamp(1 - d / (DEPTH * 0.25));
          o = d < 0 ? ahead : behind;
          // a passed paragraph drifts past slowly, so it never swells over the screen
          el.style.transform = `translate3d(0, 0, ${(d > 0 ? d * 0.4 : d).toFixed(1)}px)`;
        } else {
          const leave = clamp((beat - slot - 0.05) / 0.4);
          let enter = 1;
          if (i === ACCENT) {
            // out of the world's light, as the reader comes through it
            enter = clamp((beat - (slot - 0.45)) / 0.42);
            o = enter > 0 ? 1 : 0;
          } else {
            enter = clamp((beat - (slot - 0.48)) / 0.42);
            o = enter > 0 ? 1 : 0;
          }
          if (leave >= 1) o = 0;
          letterRefs.current[i]?.set(enter, leave);
        }
        el.style.opacity = o.toFixed(3);
        el.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      });
      const fin = finaleRef.current;
      if (fin) {
        // the cases stand where the points have drawn them, and give way to
        // the points again as everything scatters
        const o = clamp((beat - (CASES - 0.17)) / 0.04);
        fin.style.opacity = o.toFixed(3);
        fin.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [wide, last]);

  // the world can be turned by hand while it stands whole: drag with a mouse,
  // or sideways with a finger (up and down stays the page's scroll)
  function grabWorld(e: React.PointerEvent<HTMLDivElement>) {
    if (roomBus.beat < 0.5 || roomBus.beat > 1.5) return;
    if ((e.target as Element).closest('p, a, button')) return;
    let x = e.clientX, y = e.clientY;
    const touch = e.pointerType !== 'mouse';
    const move = (m: PointerEvent) => {
      roomBus.dragYaw += (m.clientX - x) * 0.006;
      if (!touch) roomBus.dragPitch = clamp(roomBus.dragPitch + (m.clientY - y) * 0.006, -1.2, 1.2);
      x = m.clientX;
      y = m.clientY;
      roomBus.emit();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  if (!wide) {
    return (
      <>
        <div className="space-y-8 mb-12">
          {blocks.map((b, i) => (
            <p key={b.slice(0, 24)} className={(i === 0 || i === last) && leadClass ? leadClass : bodyClass}>
              {b}
            </p>
          ))}
        </div>
        {finale}
      </>
    );
  }

  return (
    <div ref={trackRef} className="relative" style={{ height: `${TOTAL * BEAT_VH + 100}vh` }}>
      <Suspense fallback={null}>
        <StatementScene />
      </Suspense>
      {/* the stage is the whole screen wide, out of the page's column */}
      <div
        ref={stageRef}
        className="sticky top-0 h-screen overflow-hidden"
        style={{ perspective: `${PERSPECTIVE}px`, width: '100vw', marginLeft: 'calc(50% - 50vw)', touchAction: 'pan-y' }}
        onPointerDown={grabWorld}
      >
        <div className="relative mx-auto h-full max-w-6xl px-6">
          {blocks.map((b, i) =>
            i === ACCENT ? null : (
              <div
                key={b.slice(0, 24)}
                ref={(el) => (nodeRefs.current[i] = el)}
                className="absolute will-change-transform"
                style={
                  i === last
                    ? { left: 0, right: 0, top: '11%', margin: '0 auto', width: 'min(70vw, 52rem)', opacity: 0 }
                    : { left: '1.5rem', top: i === 0 ? '24%' : '15%', width: 'min(48vw, 34rem)', opacity: 0 }
                }
              >
                {i === 0 ? (
                  <p className={leadClass ?? bodyClass}>{b}</p>
                ) : (
                  <StatementLetters
                    ref={(h) => (letterRefs.current[i] = h)}
                    text={b}
                    gather={gather?.[i]}
                    className={i === last ? closingClass ?? leadClass ?? bodyClass : bodyClass}
                  />
                )}
              </div>
            ),
          )}
          <div ref={finaleRef} className="absolute inset-x-6 top-[14vh] [&>section]:m-0" style={{ opacity: 0, visibility: 'hidden' }}>
            {finale}
          </div>
        </div>
        <div
          ref={(el) => (nodeRefs.current[ACCENT] = el)}
          className="absolute inset-0 flex items-center"
          style={{ opacity: 0, padding: '0 6vw' }}
        >
          <AccentParts
            parts={accentParts ?? [blocks[ACCENT]]}
            className={accentClass ?? bodyClass}
            mark={accentMark}
            gather={accentGather}
            refs={(h) => (letterRefs.current[ACCENT] = h)}
          />
        </div>
      </div>
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
