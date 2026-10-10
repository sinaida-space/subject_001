import ObfuscatedMailto from './ObfuscatedMailto';

const linkFocus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff1a1a] focus-visible:outline-offset-2';

export default function ContactChannel() {
  return (
    <section id="contact" className="relative z-10 py-16 md:py-20 overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl">
        {/* h2/p (not div) — matches Services' and Body of Work's own
            eyebrow+caption markup, so all four sections' labels pick up
            the same sitewide hover glitch/bloom (index.css). */}
        <h2 className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 40 }}>
          Contact
        </h2>
        <p className="font-mono uppercase mt-2" style={{ color: 'hsl(var(--foreground) / 0.65)', fontSize: 20 }}>
          Open for collaboration.
        </p>

        <p
          className="font-mono uppercase font-normal text-foreground mt-[7vh] mb-0 text-[16vw] md:text-[clamp(64px,11vw,176px)]"
          style={{ lineHeight: 0.9, letterSpacing: '-0.02em' }}
        >
          Let’s talk.
        </p>

        {/* CTA — one bold action, plain links, base line in the same row */}
        <div className="flex flex-wrap items-center gap-x-7 gap-y-4 mt-[6vh]">
          <ObfuscatedMailto
            label="EMAIL ME ↗"
            className={`font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none ${linkFocus}`}
            style={{
              border: '1px solid hsl(var(--sinaida-red))',
              color: 'hsl(var(--primary-legible))',
              background: 'hsl(var(--sinaida-red) / 0.06)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'hsl(var(--primary-legible))';
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'hsl(var(--sinaida-red) / 0.06)';
              e.currentTarget.style.color = 'hsl(var(--primary-legible))';
            }}
          />
          <a
            href="https://www.instagram.com/sin.ai.da/"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-mono text-[13px] text-foreground/60 transition-colors hover:text-primary-legible ${linkFocus}`}
          >
            Instagram ↗
          </a>
          <a
            href="https://www.linkedin.com/in/sinaida"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-mono text-[13px] text-foreground/60 transition-colors hover:text-primary-legible ${linkFocus}`}
          >
            LinkedIn ↗
          </a>
          <a
            href="https://calendly.com/sinaida"
            target="_blank"
            rel="noopener"
            className={`font-mono text-[13px] text-foreground/60 transition-colors hover:text-primary-legible ${linkFocus}`}
          >
            Book a call ↗
          </a>
          <span className="font-mono text-[13px] w-full md:w-auto md:ml-auto" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
            Based in Prague. Working&nbsp;globally.
          </span>
        </div>
      </div>
    </section>
  );
}
