import { useState } from 'react';
import ObfuscatedMailto from './ObfuscatedMailto';
import DitherText from './DitherText';

const linkFocus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff1a1a] focus-visible:outline-offset-2';

// The two ways in under LET'S TALK: write, or book a call. EMAIL ME also
// shows the address, resolved out of red dither beside the buttons, and copies
// it (#179): a mailto does nothing for anyone without a mail app set up, and
// the address still never sits in the page until someone asks for it.
export default function ContactLinks() {
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const onOpen = (a: string) => {
    setAddress(a);
    navigator.clipboard?.writeText(a).then(() => setCopied(true), () => setCopied(false));
  };
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
      <ObfuscatedMailto
        label="EMAIL ME ↗"
        onOpen={onOpen}
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
      <span role="status" className="flex items-baseline gap-3 font-mono text-[13px]">
        {address && <DitherText text={address} className="select-all text-foreground" />}
        {address && copied && <span className="text-[11px] uppercase tracking-[0.15em] text-primary-legible">Copied</span>}
      </span>
    </div>
  );
}
