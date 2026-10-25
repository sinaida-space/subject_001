import { useState } from 'react';
import { contactAddress } from '@/lib/contactAddress';
import DitherText from './DitherText';

const linkFocus = 'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[#ff1a1a] focus-visible:outline-offset-2';

// Writes to the clipboard. navigator.clipboard needs a secure origin, so the
// old textarea copy stands in where it is missing (plain-http previews).
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // falls through to the textarea
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return ok;
}

// The two ways in under LET'S TALK: write, or book a call. COPY EMAIL puts the
// address on the clipboard and never on the page, so neither scrapers nor
// visitors see it; the line beside the buttons says what to do next. Opening a
// mail app was dropped: on desktops most people write from webmail, and a mail
// app opening unasked is what they hate. Only if the copy fails does the
// address show, so nobody is left without it. Without JavaScript the link leads
// to the address written out in the privacy policy.
export default function ContactLinks() {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  // counts copies, so a second press redraws the hint line as fresh feedback
  const [copies, setCopies] = useState(0);
  const [hover, setHover] = useState(false);
  const onCopy = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const ok = await copyText(contactAddress());
    setState(ok ? 'copied' : 'failed');
    if (ok) setCopies(n => n + 1);
  };
  // Once copied the button goes grey and says so, and stays pressable: a
  // second press copies again. The red fill is a mouse hover only, since a
  // tap fires the same enter event and would leave the button looking active.
  const copied = state === 'copied';
  const ink = copied ? 'hsl(var(--foreground) / 0.6)' : 'hsl(var(--primary-legible))';
  const style = copied
    ? { border: `1px solid ${ink}`, color: hover ? 'hsl(var(--foreground))' : ink, background: 'transparent' }
    : hover
      ? { border: '1px solid hsl(var(--sinaida-red))', color: '#000', background: 'hsl(var(--primary-legible))' }
      : { border: '1px solid hsl(var(--sinaida-red))', color: ink, background: 'hsl(var(--sinaida-red) / 0.06)' };
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
      <a
        href="/privacy/#contact-me"
        role="button"
        onClick={onCopy}
        className={`font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none ${linkFocus}`}
        style={style}
        onPointerEnter={e => { if (e.pointerType === 'mouse') setHover(true); }}
        onPointerLeave={() => setHover(false)}
      >
        {/* both labels share one cell, so the button keeps the wider one's size; the
            negative margin takes back the tracking after the last letter */}
        <span className="-mr-[0.15em] inline-grid justify-items-center">
          <span className={`col-start-1 row-start-1 ${copied ? 'invisible' : ''}`} aria-hidden={copied}>Copy email</span>
          <span className={`col-start-1 row-start-1 ${copied ? '' : 'invisible'}`} aria-hidden={!copied}>Email copied</span>
        </span>
      </a>
      <a
        href="https://calendly.com/sinaida"
        target="_blank"
        rel="noopener"
        className={`font-mono text-[13px] text-foreground/60 transition-colors hover:text-primary-legible ${linkFocus}`}
      >
        Book a call ↗
      </a>
      <span role="status" className="font-mono text-[13px]">
        {copied && <DitherText key={copies} text="Copied. Open your mail, paste it in, and say hello." className="text-foreground" />}
        {state === 'failed' && <DitherText text={contactAddress()} className="select-all text-foreground" />}
      </span>
    </div>
  );
}
