import ContactLinks from './ContactLinks';
import StarTitle, { LiteTitle } from './StarTitle';
import { useRenderMode } from '@/hooks/useRenderMode';

const NB = ' ';

export default function ContactChannel() {
  const full = useRenderMode().mode === 'full';
  // the caption is the question, in both modes
  const question = (
    <p className="font-mono text-foreground mt-2 max-w-[28ch] text-[20px] md:text-[clamp(22px,2.2vw,34px)]" style={{ lineHeight: 1.25 }}>
      {`Got an idea that should be seen, heard, and${NB}felt?`}
    </p>
  );
  return (
    <section id="contact" className="relative z-10 py-16 md:py-20 overflow-hidden">
      <div className="site-frame">
        {/* h2/p (not div) — matches Services' and Body of Work's own
            eyebrow+caption markup, so all four sections' labels pick up
            the same sitewide hover glitch/bloom (index.css). */}
        {full ? <StarTitle text="Contact" caption={question} clear /> : <LiteTitle text="Contact" caption={question} />}

        <p
          className="font-mono uppercase font-normal text-foreground mt-[7vh] mb-0 text-[16vw] md:text-[clamp(64px,11vw,176px)]"
          style={{ lineHeight: 0.9, letterSpacing: '-0.02em' }}
        >
          Let’s talk.
        </p>

        {/* CTA — one bold action, plain links, base line in the same row */}
        <div className="flex flex-wrap items-center gap-x-7 gap-y-4 mt-[6vh]">
          {/* the two ways in; in full mode on the home page they pour into
              the sky of the last screen as the footer comes (#179) */}
          <div data-pour-src className="[opacity:var(--pour-out,1)] focus-within:[opacity:1]">
            <ContactLinks />
          </div>
          <span className="font-mono text-[13px] w-full md:w-auto md:ml-auto" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
            Based in Prague. Working&nbsp;globally.
          </span>
        </div>
      </div>
    </section>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
