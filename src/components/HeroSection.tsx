import { nbsp } from '@/lib/typo';
import MeltHeadline from '@/components/melt/MeltHeadline';

type HeroDraft = 'a' | 'b';

function getHeroDraft(): HeroDraft {
  if (typeof window === 'undefined') return 'a';
  return new URLSearchParams(window.location.search).get('hero') === 'b' ? 'b' : 'a';
}

const HEADLINE_CLASS =
  'uppercase font-display tracking-[-0.02em] text-[clamp(4rem,14vw,12rem)] leading-[0.85] text-foreground';

interface DraftProps {
  scrollToContact: () => void;
}

/** Draft A — name as display. Headline wall-to-wall, supporting row below it. */
function HeroDraftA({ scrollToContact }: DraftProps) {
  return (
    <div className="flex flex-col">
      <MeltHeadline lines={['SINAIDA', 'KRIVCHENKO']} className={HEADLINE_CLASS} />

      <div className="mt-8 md:mt-10 flex flex-col md:flex-row md:items-start gap-6 md:gap-12">
        <p className="clinical-label text-primary-legible break-words md:pt-1">
          NEW MEDIA ARTIST
        </p>

        <div className="border-l border-primary/30 pl-8 space-y-5 md:ml-auto md:max-w-md">
          <p
            className="font-mono text-sm leading-relaxed"
            style={{ color: 'hsl(var(--foreground) / 0.82)' }}
          >
            {nbsp('Building interactive digital frameworks for complex human narratives.')}
          </p>
          <button
            type="button"
            onClick={scrollToContact}
            className="font-mono text-xs uppercase tracking-[0.15em] px-5 py-3 border border-primary text-primary-legible bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-colors duration-300 cursor-none"
          >
            Contact me
          </button>
        </div>
      </div>
    </div>
  );
}

/** Draft B — statement as display. Name appears once, small, next to Contact. */
function HeroDraftB({ scrollToContact }: DraftProps) {
  return (
    <div className="flex flex-col">
      <MeltHeadline
        lines={['VISUAL WORLDS', 'FOR PHYSICAL', 'SPACES']}
        className={HEADLINE_CLASS}
        lineClassNames={['text-foreground', 'text-foreground', 'text-primary']}
      />

      <div className="mt-8 md:mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <p className="clinical-label text-primary-legible break-words">
          SINAIDA KRIVCHENKO · NEW MEDIA ARTIST
        </p>
        <button
          type="button"
          onClick={scrollToContact}
          className="font-mono text-xs uppercase tracking-[0.15em] px-5 py-3 border border-primary text-primary-legible bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-colors duration-300 cursor-none shrink-0"
        >
          Contact me
        </button>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const draft = getHeroDraft();

  const scrollToContact = () => {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center z-10 pt-40 md:pt-32 lg:pt-36 pb-16 md:pb-20">
      <div className="container mx-auto px-8 md:px-10 lg:px-12 max-w-7xl relative z-10">
        {draft === 'b' ? (
          <HeroDraftB scrollToContact={scrollToContact} />
        ) : (
          <HeroDraftA scrollToContact={scrollToContact} />
        )}
      </div>
    </section>
  );
}
