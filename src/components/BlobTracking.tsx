import { Fragment, useEffect, useRef, useState } from 'react';
import workRedkiePtitsy from '@/assets/work-redkie-ptitsy.jpg';
import workEyesChico from '@/assets/work-eyes-chico.jpg';
import workAetherCurrents from '@/assets/work-aether-currents.jpg';

// ── Stagger fade-in helper (mirrors AboutSection's Reveal pattern) ──
function Reveal({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Four L-shaped corner ticks per square — base ~4px outside the border,
// nudging 2px further out on hover.
const CORNERS = [
  { key: 'tl', pos: '-top-1 -left-1', hover: 'group-hover:-top-1.5 group-hover:-left-1.5' },
  { key: 'tr', pos: '-top-1 -right-1', hover: 'group-hover:-top-1.5 group-hover:-right-1.5' },
  { key: 'bl', pos: '-bottom-1 -left-1', hover: 'group-hover:-bottom-1.5 group-hover:-left-1.5' },
  { key: 'br', pos: '-bottom-1 -right-1', hover: 'group-hover:-bottom-1.5 group-hover:-right-1.5' },
] as const;

function CornerTicks() {
  return (
    <>
      {CORNERS.map(({ key, pos, hover }) => (
        <Fragment key={key}>
          <span className={`pointer-events-none absolute h-px w-3.5 bg-primary/90 transition-all duration-300 ${pos} ${hover}`} />
          <span className={`pointer-events-none absolute h-3.5 w-px bg-primary/90 transition-all duration-300 ${pos} ${hover}`} />
        </Fragment>
      ))}
    </>
  );
}

interface Blob {
  index: string;
  title: string;
  src: string;
  alt: string;
  posClass: string;
  hoverPosClass: string;
}

const BLOBS: Blob[] = [
  {
    index: '01',
    title: 'Redkie Ptitsy',
    src: workRedkiePtitsy,
    alt: 'Redkie Ptitsy, solarized detail',
    posClass: 'object-[30%_40%]',
    hoverPosClass: 'group-hover:object-[35%_45%]',
  },
  {
    index: '02',
    title: 'The Eyes Chico',
    src: workEyesChico,
    alt: 'The Eyes Chico, solarized detail',
    posClass: 'object-[60%_20%]',
    hoverPosClass: 'group-hover:object-[55%_25%]',
  },
  {
    index: '03',
    title: 'Aether Currents',
    src: workAetherCurrents,
    alt: 'Aether Currents, solarized detail',
    posClass: 'object-[45%_70%]',
    hoverPosClass: 'group-hover:object-[50%_65%]',
  },
];

function BlobSquare({ blob, delay, offsetClass }: { blob: Blob; delay: number; offsetClass?: string }) {
  return (
    <Reveal delay={delay}>
      <div
        className={`group relative aspect-square w-[86vw] max-w-[420px] border border-primary/60 transition-colors duration-300 hover:border-primary md:w-[clamp(260px,28vw,420px)] ${offsetClass ?? ''}`}
      >
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={blob.src}
            alt={blob.alt}
            className={`absolute inset-0 h-full w-full scale-[1.4] object-cover transition-[transform,object-position] duration-[600ms] ease-out group-hover:scale-[1.55] ${blob.posClass} ${blob.hoverPosClass}`}
            style={{ filter: 'url(#solarize) contrast(1.15) saturate(1.2)' }}
          />
        </div>
        <CornerTicks />
        <div className="clinical-label absolute left-2 top-2 bg-background/75 px-1.5 py-0.5 text-primary">{blob.index}</div>
        <div className="absolute bottom-2 left-2 bg-background/75 px-1.5 py-0.5 font-mono text-xs text-foreground/80">{blob.title}</div>
      </div>
    </Reveal>
  );
}

export default function BlobTracking() {
  return (
    <section aria-labelledby="blob-tracking-heading" className="relative z-10 py-24">
      <svg width="0" height="0" aria-hidden="true">
        <filter id="solarize">
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0 1 0" />
            <feFuncG type="table" tableValues="0 1 0" />
            <feFuncB type="table" tableValues="0 1 0" />
          </feComponentTransfer>
        </filter>
      </svg>

      <div className="container mx-auto max-w-7xl px-6">
        <Reveal>
          <p id="blob-tracking-heading" className="clinical-label text-primary">
            Blob Tracking
          </p>
          <p className="mt-2 font-mono text-sm text-foreground/60">
            Machine vision watching the work. Fragments isolated, inverted, tracked.
          </p>
        </Reveal>

        <div className="mt-14 flex flex-col items-center gap-12 md:flex-row md:items-start md:justify-center md:gap-8 lg:gap-10">
          {BLOBS.map((blob, i) => (
            <BlobSquare
              key={blob.index}
              blob={blob}
              delay={i * 120}
              offsetClass={i === 1 ? 'md:translate-y-10' : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
