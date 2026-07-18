import { useEffect, useState } from 'react';
import { synth, type SynthState } from '@/lib/constellationSynth';

// ── The instrument's control surface ────────────────────────
// Revealed only after the visitor drags a star (see ConstellationFull). Styled
// like an activated edge in the graph — a thin red-lit frame that hums. Sound
// is OFF until the visitor presses play: grace first, curiosity rewarded.

interface Props {
  onReset: () => void;
  showUnlockCard: boolean;
  onDismissCard: () => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-display text-[11px] text-foreground/50">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-foreground/20 sm:w-20"
        // pan-y lets a vertical swipe on the slider scroll the page; horizontal
        // still drags the thumb. Without this the range input eats the gesture.
        style={{ accentColor: 'hsl(var(--primary))', touchAction: 'pan-y' }}
        aria-label={label}
      />
      <span className="w-7 text-right font-mono text-[9px] tabular-nums text-primary/80">{format(value)}</span>
    </label>
  );
}

export default function SynthPanel({ onReset, showUnlockCard, onDismissCard }: Props) {
  const [state, setState] = useState<SynthState>(synth.getState());

  useEffect(() => synth.subscribe(setState), []);

  return (
    // Full-height overlay pinned to the bottom of the map, so the sticky footer
    // has a flow position at the wrap's bottom edge (the canvas itself is
    // absolutely positioned and out of flow). The bar then rides the viewport
    // bottom while the map is on screen and leaves with the section.
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-end">
      <div className="pointer-events-none sticky bottom-4 flex w-full flex-col items-center gap-3 px-3">
        {/* "You found it" window — retro-OS framing, matches the project readout */}
      {showUnlockCard && (
        <div
          className="pointer-events-auto w-[min(92vw,380px)] border border-primary/60 bg-black/85 font-mono backdrop-blur-md"
          style={{ boxShadow: '0 0 24px hsl(var(--primary) / 0.28)' }}
          role="dialog"
          aria-label="Audio unlocked"
        >
          <div className="flex items-center justify-between border-b border-primary/40 px-3 py-1.5">
            <span className="text-[11px] text-primary">SIGNAL // AUDIO — UNLOCKED</span>
            <button
              type="button"
              onClick={onDismissCard}
              className="text-[11px] text-foreground/50 hover:text-primary"
              aria-label="Close"
            >
              [ x ]
            </button>
          </div>
          <div className="space-y-3 px-4 py-3">
            <p className="text-[12px] leading-relaxed text-foreground/75">
              You pulled a star out of place, and the map answered. This constellation is also an instrument.
            </p>
            <p className="text-[12px] leading-relaxed text-foreground/60">
              Project stars are drums and bass — left/right sets when they fire, up/down sets their pitch. Skill stars
              never sound; they bend the signal by where you leave them. Drag, drop, listen. ■ sends the stars home.
            </p>
            <button
              type="button"
              onClick={onDismissCard}
              className="w-full border border-primary/60 px-3 py-1.5 text-[11px] text-primary transition-colors hover:bg-primary/10"
            >
              OK — compose
            </button>
          </div>
        </div>
      )}

      {/* Transport / control bar */}
      <div
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border border-primary/50 bg-black/75 px-3 py-2 backdrop-blur-md"
        style={{ boxShadow: '0 0 18px hsl(var(--primary) / 0.22)', touchAction: 'pan-y' }}
      >
        <button
          type="button"
          onClick={() => {
            // Redundant with the pointerdown-level prime in ConstellationFull,
            // but cheap and harmless — a second guaranteed unlock point in case
            // the visitor's first touch on the whole page happens to be this
            // button rather than a drag.
            synth.primeFromGesture();
            synth.toggle();
          }}
          className="flex items-center gap-2 border border-primary/60 px-2.5 py-1 font-display text-[11px] text-primary transition-colors hover:bg-primary/10"
          aria-pressed={state.playing}
        >
          <span className="text-[11px] leading-none">{state.playing ? '❚❚' : '▶'}</span>
          {state.playing ? 'Playing' : 'Play'}
        </button>

        <Slider
          label="BPM"
          value={state.tempo}
          min={60}
          max={140}
          step={1}
          onChange={(v) => synth.setTempo(v)}
          format={(v) => String(Math.round(v))}
        />
        <Slider
          label="Tone"
          value={state.tone}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => synth.setTone(v)}
          format={(v) => String(Math.round(v * 9))}
        />
        <Slider
          label="Vol"
          value={state.volume}
          min={0}
          max={0.6}
          step={0.01}
          onChange={(v) => synth.setVolume(v)}
          format={(v) => String(Math.round((v / 0.6) * 9))}
        />

        <button
          type="button"
          onClick={onReset}
          className="border border-foreground/25 px-2.5 py-1 font-display text-[11px] text-foreground/60 transition-colors hover:border-primary/50 hover:text-primary"
          aria-label="Send stars home"
          title="Send stars home"
        >
          ■ Home
        </button>
        </div>
      </div>
    </div>
  );
}
