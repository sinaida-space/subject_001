import { useEffect, useState } from 'react';

// ── Draft switcher (#14) ──
// Lets Sinaida compare the RED ROOM and STAGE visual drafts for Hero + About
// live in the browser. Sets data-draft on <html>; src/index.css reads that
// attribute to scope the two drafts' color overrides to .draft-section only.

type Draft = 'red' | 'stage';

const STORAGE_KEY = 'aesthetic-draft';

function isDraft(value: string | null): value is Draft {
  return value === 'red' || value === 'stage';
}

function readInitialDraft(): Draft {
  if (typeof window === 'undefined') return 'stage';

  const fromUrl = new URLSearchParams(window.location.search).get('draft');
  if (isDraft(fromUrl)) return fromUrl;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isDraft(stored)) return stored;
  } catch {
    /* ignore */
  }

  return 'stage';
}

export default function DraftSwitcher() {
  const [draft, setDraft] = useState<Draft>(readInitialDraft);

  useEffect(() => {
    document.documentElement.setAttribute('data-draft', draft);
    try {
      localStorage.setItem(STORAGE_KEY, draft);
    } catch {
      /* ignore */
    }
  }, [draft]);

  const options: { value: Draft; label: string }[] = [
    { value: 'red', label: 'R' },
    { value: 'stage', label: 'S' },
  ];

  return (
    <div
      className="fixed bottom-4 right-4 z-[10000] flex gap-1 border border-primary/40 bg-background/85 p-1 backdrop-blur-sm"
      role="group"
      aria-label="Visual draft switcher"
    >
      {options.map(({ value, label }) => {
        const active = draft === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setDraft(value)}
            aria-pressed={active}
            aria-label={value === 'red' ? 'Switch to RED ROOM draft' : 'Switch to STAGE draft'}
            className="font-data flex h-6 w-6 items-center justify-center uppercase transition-colors duration-200"
            style={{
              fontSize: 11,
              color: active ? '#ff3333' : 'hsl(var(--foreground) / 0.4)',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
