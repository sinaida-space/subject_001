// A meditative pause between sections — mostly whitespace, with a single
// slow-breathing node on a faint vertical thread. Reads as a held breath /
// signal at rest. Purely decorative; hidden from assistive tech.
export default function SectionBreak() {
  return (
    <div className="flex select-none flex-col items-center py-16 md:py-24" aria-hidden>
      <span
        className="block w-px"
        style={{ height: 56, background: 'linear-gradient(to bottom, transparent, hsl(var(--border)))' }}
      />
      <span className="my-3 block h-1.5 w-1.5 rounded-full bg-primary/70" style={{ animation: 'breath-pulse 4s ease-in-out infinite' }} />
      <span
        className="block w-px"
        style={{ height: 56, background: 'linear-gradient(to top, transparent, hsl(var(--border)))' }}
      />
      <style>{`
        @keyframes breath-pulse {
          0%, 100% { opacity: 0.35; box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
          50% { opacity: 1; box-shadow: 0 0 10px 2px hsl(var(--primary) / 0.5); }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-hidden] span[style*="breath-pulse"] { animation: none !important; opacity: 0.6 !important; }
        }
      `}</style>
    </div>
  );
}
