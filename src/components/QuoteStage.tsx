// ── The belief, on its own screen between the hero and About ──
// Full mode: a tall track with a sticky screen; QuoteGate drives it with
// scroll (the lines blow in one by one, then the belief pours into About).
// Lite mode: one plain screen.
//
// Five lines, each its own block so the gate can hand them over one at a
// time; "seen" and "connected" are spans so they can light up.

const NB = ' ';

export default function QuoteStage({ pinned }: { pinned: boolean }) {
  return (
    <section data-quote-track aria-label="Belief" className={pinned ? 'relative z-10 h-[260svh]' : 'relative z-10'}>
      <div
        data-quote-stage
        className={pinned ? 'sticky top-0 flex h-[100svh] items-center' : 'flex min-h-[80svh] items-center py-24'}
      >
        <div className="container mx-auto max-w-7xl px-6">
          <p
            data-quote
            className="mx-auto m-0 w-fit max-w-full font-display uppercase font-normal text-foreground leading-[1.05] tracking-[-0.01em] text-[7.4vw] md:text-[clamp(2rem,min(3.9vw,7svh),4.5rem)]"
          >
            <span data-line="0" className="block">{`I${NB}believe`}</span>
            <span data-line="1" className="block">{`that technology is${NB}only meaningful${NB}when`}</span>
            <span data-line="2" className="block">{`it${NB}helps people feel${NB}`}<span data-seen>seen</span>,</span>
            <span data-line="3" className="block">heard,</span>
            <span data-line="4" className="block">{`and${NB}`}<span data-connected>connected</span>.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
