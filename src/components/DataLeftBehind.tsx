import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// The footer's question opens a small system dialog, in the Snake window's
// manner: the data left behind, some of it music, and one playlist to listen
// to. A hidden egg: the line looks like plain text and only a cursor or a
// focus ring gives it away.

const PLAYLIST = 'https://open.spotify.com/playlist/394UQrjBknxawNXIY8miep';

export default function DataLeftBehind({ children }: { children: string }) {
  const [open, setOpen] = useState(false);
  const listenRef = useRef<HTMLAnchorElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    listenRef.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer bg-transparent p-0 text-left uppercase italic tracking-[0.15em] text-inherit"
        style={{ font: 'inherit' }}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <div className="snake-backdrop fixed inset-0 z-100 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="data-left-behind-title"
              className="snake-window w-full max-w-104"
              style={{ border: '1px solid #CC1414', boxShadow: '0 0 40px rgba(204,20,20,0.3)', background: 'hsl(var(--background))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-5 py-2" style={{ borderBottom: '1px solid hsl(var(--graphite))' }}>
                <span id="data-left-behind-title" className="font-mono text-[16px] tracking-[1px]" style={{ color: '#CC1414' }}>
                  DATA_LEFT_BEHIND.EXE
                </span>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="font-mono text-[16px] tracking-[1px]"
                  style={{ color: 'hsl(var(--slate))', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <span aria-hidden="true">[X]</span>
                </button>
              </div>
              <div className="space-y-6 p-5">
                <p className="font-mono text-[19px] leading-normal text-foreground">Some of it is music.</p>
                <div className="flex flex-wrap gap-3">
                  <a
                    ref={listenRef}
                    href={PLAYLIST}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-primary px-5 py-2 font-display text-[18px] uppercase text-primary-legible transition-colors hover:bg-primary hover:text-background"
                  >
                    Listen<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="border border-foreground/40 px-5 py-2 font-display text-[18px] uppercase text-foreground transition-colors hover:border-foreground"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
