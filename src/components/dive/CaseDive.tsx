// ── Case dive controls and the process floor (#119), ported from
// drafts/rabbit-hole. On a case hero: the ▼ DEPTH 02 mark dives one floor
// down (same route, ?depth=2) and up to three red threads dive sideways into
// connected works through shared skills. The floor itself is real DOM:
// the case's own process material, 1-bit crops of its key frame and a small
// still network of its tools. Canvases draw once and stay still.

import { useEffect, useLayoutEffect, useRef, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PROJECTS, type Project } from '@/data/projects';
import { SKILLS } from '@/data/graph';
import { diveBus, isDiveState, type DiveRequest } from '@/lib/diveBus';
import DitheredThumb from '@/components/DitheredThumb';

const RED = [204, 0, 0]; // --sinaida-red
const VOID = [5, 5, 5]; // --background

// Click → dive from the control's centre; a plain click falls through to the
// link when no dive will run (or with a modifier key, for a new tab).
function diveClick(req: Omit<DiveRequest, 'origin'>) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (diveBus.dive({ ...req, origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } })) e.preventDefault();
  };
}

/** Up to three other cases sharing the most skills, accent skills named first. */
function threadsFor(project: Project) {
  const skill = new Map(SKILLS.map((s) => [s.id, s]));
  return PROJECTS.filter((o) => o.caseStudy && o.id !== project.id)
    .map((o) => ({
      to: o,
      shared: project.skills
        .filter((s) => o.skills.includes(s))
        .map((s) => skill.get(s))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .sort((a, b) => Number(!!b.accent) - Number(!!a.accent)),
    }))
    .filter((t) => t.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length)
    .slice(0, 3);
}

/** ▼ How it was made: dives one floor down to the process page. In lite mode
 * no dive runs, so the link falls through to plain navigation. */
export function CaseDiveControls({ project }: { project: Project }) {
  const { pathname } = useLocation();
  return (
    <div className="mt-6">
      <Link
        to={{ pathname, search: '?depth=2' }}
        data-dive=""
        data-dive-anchor="depth"
        onClick={diveClick({ to: `${pathname}?depth=2`, dialect: project.dialect, image: project.image, anchor: 'depth' })}
        className="clinical-label text-primary-legible transition-colors hover:text-accent"
        aria-label="How it was made: the process behind this work"
      >
        ▼ How it was made
      </Link>
    </div>
  );
}

/** Related works at the foot of a case: up to three cases sharing the most
 * skills, each as a dithered still with its title and the skill it shares.
 * Quiet on purpose (grey, red only on hover): reference, not a call to action. */
export function RelatedWorks({ project }: { project: Project }) {
  const threads = threadsFor(project);
  if (threads.length === 0) return null;
  return (
    <nav aria-label="Related works" className="mt-14" style={{ borderTop: '1px solid hsl(var(--graphite))', paddingTop: '24px' }}>
      <div className="clinical-label mb-5 text-foreground/50">Related works</div>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {threads.map(({ to, shared }) => (
          <li key={to.id}>
            <Link
              to={`/work/${to.id}`}
              data-dive=""
              data-dive-anchor={`thread:${to.id}`}
              onClick={diveClick({ to: `/work/${to.id}`, dialect: to.dialect, image: to.image, anchor: `thread:${to.id}` })}
              className="group block"
            >
              {to.image && (
                <div className="aspect-[4/3] overflow-hidden border border-foreground/10 opacity-60 transition group-hover:border-primary group-hover:opacity-100">
                  <DitheredThumb src={to.image} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="mt-3 font-mono text-[13px] uppercase tracking-[0.15em] text-foreground/75 transition-colors group-hover:text-foreground">
                {to.title} →
              </div>
              {shared[0] && (
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground/40">{shared[0].label}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Three crops of the key frame, ordered-dithered to 1 bit, red on void.
function OneBitCrops({ src }: { src: string }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.src = src;
    img
      .decode()
      .then(() => {
        if (!alive) return;
        const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
        const cw = 192, ch = 144; // 4:3 cells, magnified with pixelated scaling
        // crop windows as fractions of the frame: left, centre, right
        const crops = [
          [0.04, 0.1],
          [0.36, 0.4],
          [0.66, 0.18],
        ];
        crops.forEach(([fx, fy], i) => {
          const c = refs.current[i];
          if (!c) return;
          c.width = cw;
          c.height = ch;
          const g = c.getContext('2d', { willReadFrequently: true });
          if (!g) return;
          const sw = img.naturalWidth * 0.3, sh = (sw * ch) / cw;
          g.drawImage(img, fx * img.naturalWidth, Math.min(fy * img.naturalHeight, img.naturalHeight - sh), sw, sh, 0, 0, cw, ch);
          const px = g.getImageData(0, 0, cw, ch);
          const d = px.data;
          for (let y = 0; y < ch; y++)
            for (let x = 0; x < cw; x++) {
              const o = (y * cw + x) * 4;
              const lum = (0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]) / 255;
              const on = lum > (bayer[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
              const col = on ? RED : VOID;
              d[o] = col[0];
              d[o + 1] = col[1];
              d[o + 2] = col[2];
              d[o + 3] = 255;
            }
          g.putImageData(px, 0, 0);
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [src]);
  return (
    <div className="grid grid-cols-3 gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <canvas
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="w-full border border-primary/40"
          style={{ aspectRatio: '4 / 3', imageRendering: 'pixelated' }}
        />
      ))}
    </div>
  );
}

// The tools as a still star network around the work: numbered to match the list.
function ToolNetwork({ tools }: { tools: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth, h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const g = c.getContext('2d');
      if (!g) return;
      g.scale(dpr, dpr);
      g.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.36;
      const pts = tools.map((_, i) => {
        const a = -Math.PI / 2 + (i / tools.length) * Math.PI * 2;
        return [cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r];
      });
      g.strokeStyle = 'rgba(204, 0, 0, 0.7)';
      g.lineWidth = 1;
      pts.forEach(([x, y], i) => {
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(x, y);
        const [nx, ny] = pts[(i + 1) % pts.length];
        if (pts.length > 2) g.lineTo(nx, ny);
        g.stroke();
      });
      g.fillStyle = 'rgb(204, 0, 0)';
      g.fillRect(cx - 4, cy - 4, 8, 8);
      g.font = "13px 'Geist Pixel', ui-monospace, monospace";
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      pts.forEach(([x, y], i) => {
        g.fillStyle = 'rgb(242, 239, 233)';
        g.fillRect(x - 2.5, y - 2.5, 5, 5);
        g.fillStyle = 'rgba(242, 239, 233, 0.65)';
        g.fillText(String(i + 1).padStart(2, '0'), x, y + (y < cy ? -14 : 14));
      });
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [tools]);
  return <canvas ref={ref} aria-hidden="true" className="h-[220px] w-full" />;
}

/** DEPTH 02: the process floor, on the case route via ?depth=2. */
export function ProcessFloor({ project, full }: { project: Project; full: boolean }) {
  const cs = project.caseStudy!;
  const location = useLocation();
  const navigate = useNavigate();
  const arrivedByDive = isDiveState(location.state);

  // a floor starts at its top, however it was reached
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Esc climbs back the same way the "Back to the case" link does
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (arrivedByDive) navigate(-1);
      else navigate(location.pathname);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [arrivedByDive, navigate, location.pathname]);

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-12">
      <div className="md:col-span-5">
        <Link
          to={location.pathname}
          // climbing back after a dive is Back, so the reverse dive plays
          onClick={(e) => {
            if (arrivedByDive && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              navigate(-1);
            }
          }}
          className="clinical-label mb-8 inline-block text-primary-legible transition-colors hover:text-accent"
        >
          ▲ Back to the case
        </Link>
        <div className="clinical-label text-primary-legible">How it was made</div>
        <h1 className="mt-4 font-display text-4xl uppercase font-light leading-[0.95] text-foreground md:text-5xl">
          {project.title}
        </h1>

        {full && project.image && (
          <div className="mt-10">
            <OneBitCrops src={project.image} />
          </div>
        )}

        {project.tools && project.tools.length > 0 && (
          <div className="mt-10">
            <h2 className="clinical-label mb-3 text-foreground/65">Tools</h2>
            {full && <ToolNetwork tools={project.tools} />}
            <ol className="mt-3 flex flex-col gap-1 font-mono text-[13px] uppercase tracking-[0.15em] text-foreground/85">
              {project.tools.map((t, i) => (
                <li key={t}>
                  <span className="text-primary-legible">{String(i + 1).padStart(2, '0')}</span> {t}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="md:col-span-7">
        {cs.sections?.map((s) => (
          <section key={s.heading} className="mb-10">
            <h2 className="clinical-label mb-3 text-foreground/65">{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p
                key={p.slice(0, 32)}
                className="max-w-[70ch] font-mono text-[17px] leading-relaxed text-foreground/85 [&:not(:first-of-type)]:mt-6"
              >
                {p}
              </p>
            ))}
          </section>
        ))}
        {cs.method && (
          <section className="mb-10">
            <h2 className="clinical-label mb-3 text-foreground/65">Signal chain · {cs.method.trace}</h2>
            <ol className="flex flex-col gap-6">
              {cs.method.stages.map((s, i) => (
                <li key={s.label} className="max-w-[70ch]">
                  <div className="font-mono text-[13px] uppercase tracking-[0.15em] text-primary-legible">
                    {String(i + 1).padStart(2, '0')} · {s.label}
                  </div>
                  <p className="mt-2 font-mono text-[17px] leading-relaxed text-foreground/85">{s.detail}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 max-w-[70ch] font-mono text-[13px] leading-relaxed text-foreground/65">{cs.method.footer}</p>
          </section>
        )}
      </div>
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
