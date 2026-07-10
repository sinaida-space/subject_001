// Animated signal-chain diagram for the Redkie Ptitsy case page.
// CSS-only animation (no rAF loop), honors prefers-reduced-motion.
const STAGES = [
  {
    label: 'Live audio in',
    detail: 'Feed from the desk — the live mix enters as raw signal.',
  },
  {
    label: 'CHOP analysis',
    detail: 'Bands, beats and envelopes extracted in real time.',
  },
  {
    label: 'Per-song patch ×9',
    detail: 'One visual system per song — no two share a look.',
  },
  {
    label: 'Projection',
    detail: 'Light in the room, responding all night.',
  },
];

const CYCLE = 6; // seconds for one full traversal of the chain
const NODE_STEP = CYCLE / STAGES.length;

export default function SignalChain() {
  return (
    <div>
      <style>{`
        @keyframes sc-node-glow {
          0%, 8% { border-color: #22d3ee; box-shadow: 0 0 14px rgba(34,211,238,0.35), inset 0 0 10px rgba(34,211,238,0.08); }
          22%, 100% { border-color: #1a1a1a; box-shadow: none; }
        }
        @keyframes sc-dot-h {
          0% { left: 0%; opacity: 0; }
          8% { opacity: 1; }
          22% { left: 100%; opacity: 1; }
          26%, 100% { left: 100%; opacity: 0; }
        }
        @keyframes sc-dot-v {
          0% { top: 0%; opacity: 0; }
          8% { opacity: 1; }
          22% { top: 100%; opacity: 1; }
          26%, 100% { top: 100%; opacity: 0; }
        }
        .sc-node { border: 1px solid #1a1a1a; animation: sc-node-glow ${CYCLE}s linear infinite; }
        .sc-connector { position: relative; }
        .sc-dot {
          position: absolute; width: 5px; height: 5px; border-radius: 50%;
          background: #22d3ee; box-shadow: 0 0 8px rgba(34,211,238,0.8);
        }
        /* mobile: vertical chain */
        .sc-connector { width: 1px; height: 28px; margin-left: 24px; background: #1a1a1a; }
        .sc-dot { left: -2px; animation: sc-dot-v ${CYCLE}s linear infinite; }
        @media (min-width: 640px) {
          .sc-connector { width: auto; height: 1px; flex: 1 1 24px; margin-left: 0; align-self: center; }
          .sc-dot { left: 0; top: -2px; animation: sc-dot-h ${CYCLE}s linear infinite; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sc-node, .sc-dot { animation: none; }
          .sc-dot { display: none; }
        }
      `}</style>

      <div
        className="mb-3 font-mono text-[11px] tracking-[0.12em]"
        style={{ color: '#22d3ee' }}
      >
        {'> signal_path.trace() // 9 patches loaded'}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {STAGES.map((stage, i) => (
          <div key={stage.label} className="contents">
            {i > 0 && (
              <div className="sc-connector" aria-hidden="true">
                <div className="sc-dot" style={{ animationDelay: `${i * NODE_STEP - NODE_STEP * 0.75}s` }} />
              </div>
            )}
            <div
              className="sc-node flex-1 sm:min-w-0"
              style={{ background: '#0a0a0a', padding: '16px', animationDelay: `${i * NODE_STEP}s` }}
            >
              <div
                className="font-mono uppercase"
                style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#CC1414' }}
              >
                {String(i + 1).padStart(2, '0')} · {stage.label}
              </div>
              <p className="mt-2 font-mono text-[12px] leading-relaxed text-foreground/55">
                {stage.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 font-mono text-[11px] tracking-[0.12em] text-foreground/45">
        {'> full-set run · Sklad №3, Moscow · 26 March 2026'}
      </div>
    </div>
  );
}
