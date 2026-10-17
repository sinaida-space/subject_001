import { useEffect, useRef, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import DitherReveal from '@/components/DitherReveal';
import { DitherHeading, H2_CLASS } from '@/components/PageParts';
import type { Project } from '@/data/projects';
import { roomBus } from '@/lib/roomBus';

// The Statement's cases. On the heading's line, the two ways on: work
// together, or the CV.

const KIND_LABEL: Record<string, string> = {
  stage: 'Stage',
  installation: 'Installation',
  conceptual: 'Conceptual',
  game: 'Interactive web',
  tool: 'Tools',
  tutorial: 'Tutorials',
};

// In the Statement room the case images are not simply shown: they appear
// through the same ordered dither the points drew their squares in, cell by
// cell, as the reader scrolls, so the story runs on without a cut. A small
// mask per image, its cells opened in Bayer order.
const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
const MASK_CELL = 3; // css px per dither cell

function useDitherIn(host: RefObject<HTMLElement>, enabled: boolean) {
  useEffect(() => {
    const root = host.current;
    if (!enabled || !root) return;
    const tiles = [...root.querySelectorAll<HTMLElement>('[data-room-tile]')];
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let last = -1;
    const draw = () => {
      // only in the room (on a phone the cases simply stand in the column)
      if (roomBus.beats <= 1) {
        tiles.forEach((t) => (t.style.maskImage = t.style.webkitMaskImage = ''));
        return;
      }
      // from the moment the points settle until the story rests on the cases
      const p = Math.min(1, Math.max(0, (roomBus.beat - 4.84) / 0.14));
      const q = Math.round(p * 64);
      if (q === last) return;
      last = q;
      tiles.forEach((t) => {
        if (q >= 64) {
          t.style.maskImage = t.style.webkitMaskImage = '';
          return;
        }
        const w = Math.max(1, Math.round(t.clientWidth / MASK_CELL)), h = Math.max(1, Math.round(t.clientHeight / MASK_CELL));
        cv.width = w;
        cv.height = h;
        const img = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) img.data[(y * w + x) * 4 + 3] = BAYER8[(y & 7) * 8 + (x & 7)] < q ? 255 : 0;
        ctx.putImageData(img, 0, 0);
        const url = `url(${cv.toDataURL()})`;
        t.style.maskImage = t.style.webkitMaskImage = url;
        t.style.maskSize = t.style.webkitMaskSize = '100% 100%';
      });
    };
    draw();
    roomBus.listeners.add(draw);
    return () => void roomBus.listeners.delete(draw);
  }, [host, enabled]);
}

export default function StatementCases({ projects, ditherIn = false }: { projects: Project[]; ditherIn?: boolean }) {
  const hostRef = useRef<HTMLElement>(null);
  useDitherIn(hostRef, ditherIn);
  return (
    // as wide as three squares that fit the screen's height, so the heading,
    // the buttons and the cases share one edge on the left and one on the right
    <section ref={hostRef} className="relative mt-28 mb-16" style={{ maxWidth: 'calc((100vh - 380px) * 3 + 80px)' }} data-room-cases>
      <div className="relative z-20 mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <DitherHeading className={H2_CLASS}>Selected cases</DitherHeading>
        {/* the two ways on, on the heading's line */}
        <div className="flex flex-wrap gap-3">
          <Link
            to="/collaborate"
            className="border border-primary px-5 py-3 font-display text-[clamp(16px,1.3vw,22px)] uppercase text-primary-legible transition-colors hover:bg-primary hover:text-background"
          >
            Work with me →
          </Link>
          <a
            href="/files/sinaida-krivchenko-cv.pdf"
            download
            className="border border-foreground/40 px-5 py-3 font-display text-[clamp(16px,1.3vw,22px)] uppercase text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
          >
            Artist CV (PDF) ↓
          </a>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-3">
        {projects.map((p) => (
          <li key={p.id}>
            <Link to={`/work/${p.id}`} className="group block">
              <div data-room-tile>
                {p.image && <DitherReveal src={p.image} alt={`${p.title}, project still`} aspect={1} touch={false} />}
              </div>
              <h3 className="mt-4 font-display text-[clamp(20px,1.6vw,28px)] uppercase text-foreground transition-colors group-hover:text-accent">
                {p.title}
              </h3>
              <p className="mt-1 font-mono text-[16px] text-foreground/60">
                {KIND_LABEL[p.kind]} · {p.short ?? p.tagline}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
