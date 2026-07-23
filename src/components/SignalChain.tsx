// Animated signal-chain diagram for case-study pages. Content comes from
// the project's caseStudy.method data (see src/data/projects.ts).
// CSS-only animation (no rAF loop), honors prefers-reduced-motion.
export interface SignalChainStage {
  label: string;
  detail: string;
}

export interface SignalChainProps {
  /** kept for data-shape compatibility with existing case-study content; no
   * longer rendered — the terminal-style trace/footer captions read as leftover
   * dev-console chrome rather than content, so this component now shows only
   * the chain itself. */
  trace: string;
  stages: SignalChainStage[];
  footer: string;
}

const CYCLE = 6; // seconds for one full traversal of the chain

export default function SignalChain({ stages }: SignalChainProps) {
  const nodeStep = CYCLE / stages.length;
  return (
    <div>
      <style>{`
        @keyframes sc-node-glow {
          0%, 8% { background: #ff3333; box-shadow: 0 0 12px rgba(255,51,51,0.85), 0 0 24px rgba(255,51,51,0.35); }
          22%, 100% { background: #1a1a1a; box-shadow: none; }
        }
        @keyframes sc-dot-v {
          0% { top: 0%; opacity: 0; }
          8% { opacity: 1; }
          22% { top: 100%; opacity: 1; }
          26%, 100% { top: 100%; opacity: 0; }
        }
        .sc-node { border-radius: 50%; animation: sc-node-glow ${CYCLE}s linear infinite; }
        .sc-connector { position: relative; width: 1px; flex: 1 1 auto; min-height: 24px; background: #1a1a1a; }
        .sc-dot {
          position: absolute; left: -2px; width: 5px; height: 5px; border-radius: 50%;
          background: #ff3333; box-shadow: 0 0 6px rgba(255,51,51,0.9), 0 0 14px rgba(255,51,51,0.5);
          animation: sc-dot-v ${CYCLE}s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .sc-node, .sc-dot { animation: none; }
          .sc-dot { display: none; }
        }
      `}</style>

      <div className="flex flex-col">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex gap-4">
            <div className="flex flex-col items-center pt-[3px]">
              <div
                className="sc-node w-2.5 h-2.5 shrink-0"
                style={{ animationDelay: `${i * nodeStep}s` }}
              />
              {i < stages.length - 1 && (
                <div className="sc-connector" aria-hidden="true">
                  <div className="sc-dot" style={{ animationDelay: `${i * nodeStep - nodeStep * 0.75}s` }} />
                </div>
              )}
            </div>
            <div className={i < stages.length - 1 ? 'pb-6 min-w-0' : 'min-w-0'}>
              <div
                className="font-mono uppercase"
                style={{ fontSize: '12px', letterSpacing: '0.15em', color: '#ff3333' }}
              >
                {String(i + 1).padStart(2, '0')} · {stage.label}
              </div>
              <p className="mt-2 font-mono text-[14px] leading-relaxed text-foreground/70">
                {stage.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
