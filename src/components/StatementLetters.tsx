import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type CSSProperties } from 'react';

// A paragraph of the Statement room as single letters, so it can come and go
// the digital way, as a pure function of scroll:
//
//   in   each letter shows a random character first and resolves to its own,
//        left to right, the way a signal locks on; or (`from="light"`) each
//        letter condenses out of light, white-hot first and cooling to its
//        colour, the nearest to the middle of the screen first
//   out  the letters fall apart: each drops and drifts a little, and goes out
//        at its own threshold, so the paragraph thins like a dither; a few of
//        them (`gather`) fly together instead into words of the paragraph's
//        own, which hold a moment and then go out too
//
// The real text stays in the DOM for readers and assistive tech (sr-only);
// the letters are aria-hidden. `mark` is a phrase to light with a glint.

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>*#%+=~';
// words that light first when a paragraph condenses out of light, so the
// reader catches the paragraph's own vocabulary before the rest arrives
const VIBE = ['light', 'sound', 'room', 'body', 'shared', 'memory', 'strangers', 'space', 'together', 'language', 'border'];

export interface LettersHandle {
  /** enter 0..1 (1 = resolved), leave 0..1 (1 = gone) */
  set(enter: number, leave: number): void;
}

function hash(i: number, k: number) {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

const StatementLetters = forwardRef<LettersHandle, { text: string; className?: string; mark?: string; from?: 'code' | 'light'; gather?: string[] }>(
  function StatementLetters({ text, className, mark, from = 'code', gather }, ref) {
    // for the gathered words: each chosen letter's offset to its place in its word
    const flight = useRef<Map<number, [number, number]> | null>(null);
    const spans = useRef<HTMLSpanElement[]>([]);
    // for light: each letter's moment, from its distance to the screen's middle
    const order = useRef<number[] | null>(null);
    const state = useRef({ enter: -1, leave: -1 });

    // words keep together, so lines break where the plain text would
    const words = useMemo(() => {
      const out: { chars: string[]; marked: boolean; vibe: boolean }[] = [];
      const markAt = mark ? text.indexOf(mark) : -1;
      let at = 0;
      for (const w of text.split(' ')) {
        const bare = w.toLowerCase().replace(/[^a-z]/g, '');
        out.push({ chars: [...w], marked: markAt >= 0 && at >= markAt && at < markAt + (mark?.length ?? 0), vibe: VIBE.includes(bare) });
        at += w.length + 1;
      }
      return out;
    }, [text, mark]);

    useImperativeHandle(
      ref,
      () => ({
        set(enter, leave) {
          const st = state.current;
          if (Math.abs(st.enter - enter) < 1e-4 && Math.abs(st.leave - leave) < 1e-4) return;
          st.enter = enter;
          st.leave = leave;
          const n = spans.current.length;
          const decode = from === 'code';
          if (!decode && enter > 0 && !order.current) {
            const cx = window.innerWidth / 2, cy = window.innerHeight / 2, far = Math.hypot(cx, cy);
            order.current = spans.current.map((el, i) => {
              // the vibe words first, whole and readable, then the rest from the middle out
              if (el.dataset.v) return 0.04 + 0.12 * hash(i, 13);
              const r = el.getBoundingClientRect();
              return 0.3 + 0.45 * (Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy) / far) + 0.2 * hash(i, 11);
            });
          }
          if (leave <= 0) flight.current = null;
          else if (!flight.current && gather?.length) {
            // pick letters for each word in reading order, then lay the words
            // out in rows across the paragraph's middle
            const used = new Set<number>();
            const map = new Map<number, [number, number]>();
            const box = spans.current[0]?.closest('p')?.getBoundingClientRect();
            gather.forEach((word, k) => {
              const picks: number[] = [];
              let from2 = 0;
              for (const ch of word) {
                let at = spans.current.findIndex((el, i) => i >= from2 && !used.has(i) && el?.dataset.c?.toLowerCase() === ch);
                if (at < 0) at = spans.current.findIndex((el, i) => !used.has(i) && el?.dataset.c?.toLowerCase() === ch);
                if (at < 0) return;
                used.add(at);
                picks.push(at);
                from2 = at + 1;
              }
              if (!box || picks.length !== word.length) return;
              const rects = picks.map((i) => spans.current[i].getBoundingClientRect());
              const width = rects.reduce((a, r) => a + r.width, 0);
              let x = box.left + box.width / 2 - width / 2;
              const y = box.top + (box.height * (k + 1)) / (gather.length + 1);
              picks.forEach((i, j) => {
                const r = rects[j];
                map.set(i, [x - r.left, y - (r.top + r.height / 2)]);
                x += r.width;
              });
            });
            flight.current = map;
          }
          spans.current.forEach((el, i) => {
            if (!el) return;
            const fly = flight.current?.get(i);
            if (fly && leave > 0) {
              // a gathered letter: to its word, a moment readable, then out
              const g = Math.min(1, leave / 0.5), e = g * g * (3 - 2 * g);
              el.style.transform = `translate3d(${(fly[0] * e).toFixed(1)}px, ${(fly[1] * e).toFixed(1)}px, 0)`;
              el.style.opacity = leave > 0.86 + hash(i, 9) * 0.12 ? '0' : '';
              el.style.visibility = '';
              return;
            }
            // lock each letter's width once, so scrambling never moves a line
            if (!el.style.width) el.style.width = `${el.offsetWidth}px`;
            const real = el.dataset.c ?? '';
            // in: resolved once the sweep has passed, a random character just before
            const front = enter * 1.25 - (i / n) * 1.0;
            const waiting = decode && front <= 0;
            const shown = !decode || front >= 0.25 || waiting ? real : GLYPHS[Math.floor(hash(i, Math.floor(enter * 40)) * GLYPHS.length)];
            if (el.textContent !== shown) el.textContent = shown;
            el.style.visibility = waiting ? 'hidden' : '';
            if (!decode) {
              // out of light: invisible, then white-hot with a halo, then its own colour
              const l = order.current ? Math.min(1, Math.max(0, (enter - order.current[i]) / 0.18)) : 1;
              el.style.visibility = l <= 0 ? 'hidden' : '';
              el.style.color = l < 1 ? `rgb(255, 250, 242)` : '';
              el.style.textShadow = l < 1 ? `0 0 ${(2 + 10 * (1 - l)).toFixed(1)}px rgba(255, 248, 236, ${(0.9 * (1 - l)).toFixed(2)})` : '';
            }
            // out: each letter goes at its own threshold
            const gone = leave > 0 && leave > hash(i, 3) * 0.8;
            const fall = leave > 0 ? leave * (0.4 + hash(i, 5)) : 0;
            el.style.opacity = gone ? '0' : '';
            el.style.transform = fall > 0 ? `translate3d(${((hash(i, 7) - 0.5) * 40 * fall).toFixed(1)}px, ${(fall * 90).toFixed(1)}px, 0)` : '';
          });
        },
      }),
      [from, gather],
    );

    // a new width frees the letters to be measured again
    useEffect(() => {
      const free = () => {
        spans.current.forEach((el) => el && (el.style.width = ''));
        order.current = null;
      };
      window.addEventListener('resize', free);
      return () => window.removeEventListener('resize', free);
    }, []);

    let k = 0;
    let g = 0;
    return (
      <p className={className}>
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {words.map((w, wi) => (
            <span key={wi} className={w.marked ? 'room-glint' : undefined}>
              <span className="relative inline-block whitespace-nowrap">
                {w.marked && g === 0 && <span className="room-spark" style={{ left: '-0.3em', top: '-0.25em' }} />}
                {w.chars.map((c) => {
                  const i = k++;
                  const gi = w.marked ? g++ : 0;
                  return (
                    <span
                      key={i}
                      ref={(el) => el && (spans.current[i] = el)}
                      data-c={c}
                      data-v={w.vibe ? '1' : undefined}
                      className="inline-block text-center"
                      style={w.marked ? ({ '--i': gi } as CSSProperties) : undefined}
                    >
                      {c}
                    </span>
                  );
                })}
                {w.marked && wi + 1 < words.length && !words[wi + 1].marked && (
                  <span className="room-spark" style={{ right: '-0.35em', bottom: '0.1em', animationDelay: '1.7s' }} />
                )}
              </span>
              {wi < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </span>
      </p>
    );
  },
);

export default StatementLetters;

// Je suis le spectre d'une rose que tu portais hier au bal.
