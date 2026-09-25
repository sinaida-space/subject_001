import { useEffect, useRef, useState, type ReactNode } from 'react';
import StarMolecule from '@/components/StarMolecule';
import type { MoleculeId } from '@/lib/molecules';

// Every gap between homepage sections is one band of the same height, so the
// page keeps a single rhythm. Hero → About holds the red horizon line; the
// gaps after that each hold one attachment molecule, in the order the page
// courts its visitor: dopamine (the wanting), serotonin (the loop), oxytocin
// (the bond), right before Contact.
export function SectionBand({ children }: { children?: ReactNode }) {
  return <div className="relative flex h-32 md:h-40 flex-col items-center justify-center">{children}</div>;
}

// Footnote shown beside the molecule after a click, small like a video
// overlay credit: the molecule's name, then a question it would ask.
const QUESTIONS: Record<MoleculeId, string> = {
  noradrenaline: 'What if the world responded to you?',
  dopamine: 'Which world do you enter first?',
  serotonin: 'Seen enough, or want your own?',
  oxytocin: 'Shall we make something together?',
};

const CLICK_HOLD = 4500;

// A clickable molecule with its footnote. Used between sections and, for
// noradrenaline, in the hero, where `pulse` also lets the whisper flare it
// briefly (`pulseHold` ms, no footnote).
export function MoleculeNote({
  id, width, height, pulse = 0, pulseHold = 2200,
}: { id: MoleculeId; width: number; height: number; pulse?: number; pulseHold?: number }) {
  const [flare, setFlare] = useState({ key: 0, hold: CLICK_HOLD });
  const [caption, setCaption] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (pulse) setFlare((f) => ({ key: f.key + 1, hold: pulseHold }));
  }, [pulse, pulseHold]);

  const onClick = () => {
    setFlare((f) => ({ key: f.key + 1, hold: CLICK_HOLD }));
    setCaption(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCaption(false), CLICK_HOLD);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        // the hero treats a held touch as its tunnel gesture; a tap here is not that
        onTouchStart={(e) => e.stopPropagation()}
        aria-label={`${id} molecule`}
        className="block rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <StarMolecule id={id} width={width} height={height} flareKey={flare.key} hold={flare.hold} />
      </button>
      <p
        aria-hidden={!caption}
        className="pointer-events-none absolute left-full top-1 ml-2 w-[100px] md:ml-4 md:w-[170px] font-mono lowercase leading-[1.45] tracking-[0.03em] transition-opacity duration-500"
        // 12px sits under the site's 16px floor (index.css) on purpose: a
        // footnote, sized like a video overlay credit. Inline, so the
        // text-[Npx] floor rule does not catch it.
        style={{ opacity: caption ? 1 : 0, fontSize: 12 }}
      >
        <span style={{ color: 'hsl(var(--primary-legible))' }}>*</span>
        <span style={{ color: 'hsl(var(--foreground) / 0.75)' }}>{id}</span>
        <span className="block" style={{ color: 'hsl(var(--foreground) / 0.55)', marginTop: '1.45em' }}>{QUESTIONS[id]}</span>
      </p>
    </div>
  );
}

export default function MoleculeBreak({ id }: { id: Exclude<MoleculeId, 'noradrenaline'> }) {
  const [small] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  return (
    <SectionBand>
      <MoleculeNote id={id} width={small ? 150 : 200} height={small ? 60 : 80} />
    </SectionBand>
  );
}
