import ObfuscatedMailto from './ObfuscatedMailto';

const linkFocus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff1a1a] focus-visible:outline-offset-2';

// The two ways in: write, or book a call. Contact shows them under LET'S
// TALK; the city footer shows them again in its sky, where the same glyphs
// land after the pour (#179), so both places use this one markup.
export default function ContactLinks() {
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
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
        href="https://calendly.com/sinaida"
        target="_blank"
        rel="noopener"
        className={`font-mono text-[13px] text-foreground/60 transition-colors hover:text-primary-legible ${linkFocus}`}
      >
        Book a call ↗
      </a>
    </div>
  );
}
