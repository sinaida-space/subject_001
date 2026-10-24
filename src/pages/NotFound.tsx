import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SnakeEasterEgg from '@/components/SnakeEasterEgg';
import { useNoIndex } from '@/hooks/usePageMeta';

// The first song a computer ever sang (IBM 7094, 1961), public domain since
// long before: "Daisy Bell" by Harry Dacre, 1892.
const DAISY = 'Daisy, Daisy, give me your answer, do.';
const BLOCKS = '░▒▓█';
const PLAYLIST = 'https://open.spotify.com/playlist/2Hs1OUJppCUNZRxZh5bppa';
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;



// The line runs down like a machine's voice slowing on a record: the letters
// towards its end drift apart and fade into the blue.
function DaisyLine() {
  const decay = 1;

  // the tail of the line also stutters on its own: a few letters flick to
  // block glyphs and back, a different fault from the 404's slices
  const [stutter, setStutter] = useState<number[]>([]);
  useEffect(() => {
    if (REDUCED) return;
    const id = window.setInterval(() => {
      if (Math.random() < 0.55) return setStutter([]);
      const n = 1 + Math.floor(Math.random() * 3);
      setStutter(Array.from({ length: n }, () => DAISY.length - 1 - Math.floor(Math.random() * 9)));
    }, 160);
    return () => clearInterval(id);
  }, []);

  const chars = DAISY.split('').map((ch, i) => (decay > 0.5 && stutter.includes(i) && ch !== ' ' ? BLOCKS[i % BLOCKS.length] : ch));
  return (
    <p className="font-mono text-[clamp(18px,2.2vw,28px)] leading-[1.3]" aria-label={DAISY}>
      {chars.map((ch, i) => {
        const t = i / (chars.length - 1);
        const k = decay * t * t;
        return (
          <span
            key={i}
            aria-hidden="true"
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              marginRight: `${(k * 0.55).toFixed(3)}em`,
              opacity: 1 - k * 0.75,
              transform: `translateY(${(k * 0.18).toFixed(3)}em)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </p>
  );
}

// A crash screen, the one place the site leaves its own palette: the blue of
// an old system failure, in the site's own type. Enter goes home.
export default function NotFound() {
  const navigate = useNavigate();
  const [snakeOpen, setSnakeOpen] = useState(false);
  useNoIndex();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || snakeOpen) return;
      e.preventDefault();
      navigate('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, snakeOpen]);

  return (
    <div className="bsod relative flex h-svh flex-col justify-center overflow-hidden px-6 md:px-16">
      {snakeOpen && <SnakeEasterEgg onClose={() => setSnakeOpen(false)} />}
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-5xl">
        <div className="bsod-bar mb-10 inline-block px-3 py-1 font-mono text-[15px] uppercase tracking-[0.2em]">sinaida.eu</div>
        {/* broken on purpose: the one thing on the site that glitches by itself */}
        <h1>
          <button
            type="button"
            onClick={() => setSnakeOpen(true)}
            title="[ ??? ]"
            data-egg
            data-text="404"
            className="glitch-404 cursor-pointer border-0 bg-transparent p-0 font-display text-[clamp(120px,22vw,300px)] font-light leading-[0.85] text-inherit"
          >
            404
          </button>
        </h1>

        <div className="mt-6">
          <DaisyLine />
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 font-mono text-[15px] uppercase tracking-[0.15em]">
          <a href="/" className="bsod-bar px-5 py-3 transition-opacity hover:opacity-80">
            Reboot → home
          </a>
          <a href={PLAYLIST} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
            A bicycle built for two ↗
          </a>
        </div>
      </main>
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
