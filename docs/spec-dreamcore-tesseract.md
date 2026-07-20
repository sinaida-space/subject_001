# SPEC — Dreamcore Tesseract Interaction ("TAPE / ROOM / OBJECT")

Status: approved concept, ready to build. Author: Fable (creative direction), 2026-07-20.
Implementers: Sonnet for all component work, Haiku for git/mechanical. Fable is NOT needed to execute this spec. Do not re-derive decisions; every fork is resolved here.

## 0. Invariants (read before every task)

- **Branch**: all work on `v260720_dreamcore` (based on `v260719_t-off_glivhs-crt-RED`). NEVER commit, merge, or push to `main`. Never push at all unless Sinaida asks. Commits allowed on this branch only, one per issue/task, conventional style, ending with `(#N)` and `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **MOTION LAW (strict, no exceptions)**: nothing animates without user action. Every animation is a pure function of scroll position or a response to hover (hover = desktop fine pointers only). rAF loops must settle and stop when input ceases. No timers, no idle drift, no `dt`-accumulated rotation. One-time scroll-into-view reveals are acceptable. Glitch effects key off scroll velocity and must be deterministic functions of scroll state (reversible scrubbing), never `Math.random()` per frame.
- **Preserve untouched**: constellation mechanics + synth easter egg (`src/components/constellation/*`, `src/lib/constellationSynth*`), ECG logo, starfield, all RED-branch copy. The only constellation change allowed is the edge-bloom cherry-pick (Task T8).
- **Typography/copy**: Jersey 20 only (existing utility classes). No em dashes in any visible copy. No "x, not y" constructions in copy. No terminal cosplay: no `$` prompts, blinking cursors, bracket badges, fake OS text.
- **Two versions**: `full` = this new interaction. `lite` = the RED site exactly as it stands (current `HeroSection` etc. must remain functional as the lite path; do not delete lite-path components). `useRenderMode` decides (upgraded in T2).
- **Perf budget**: 60fps target during scroll on mid hardware; ZERO canvas work at rest; DPR cap 1.5; single 2D canvas for the tesseract (no new WebGL).
- Existing verify baseline: `npm run build` and `npx tsc --noEmit` must pass after every task.

## 1. Architecture

```
scroll/pointer events ──> useScrubBus (T1) ──rAF while dirty──> subscribers:
                                              ├─ Tesseract (T3/T4/T5): angles=f(p)
                                              ├─ SeamFace registry (T6)
                                              ├─ ECGThread (T7): dashoffset=f(P)
                                              ├─ Glitch CSS vars (T10)
                                              └─ FPS sentinel (T2, full mode only)
p  = hero-local progress, clamp(-heroRect.top / vh, 0, 1..2)   (hero runway)
P  = whole-page progress, scrollY / (docHeight - vh)
vel = smoothed |dScrollY/dt|, decays to 0 within ~150ms of scroll stopping
```

New files live in `src/components/dreamcore/` plus `src/hooks/useScrubBus.ts`. The full-mode homepage becomes `IndexFull` composition; `src/pages/Index.tsx` picks Full vs Lite composition from `useRenderMode` (lite renders exactly what RED renders today).

## 2. Tasks

Execute in phase order. Within a phase, tasks are one agent, sequential. File ownership per phase is disjoint from other phases where possible; each task lists DoD.

---

### PHASE 1 — the mechanic (prove scroll-as-rotation)

**T1. `src/hooks/useScrubBus.ts` — the single conductor.**
Contract:
```ts
type ScrubState = { p: number; P: number; vel: number; pointerX: number; pointerY: number; hoverAllowed: boolean };
subscribeScrub(cb: (s: ScrubState) => void): () => void;
// Internals: passive scroll + pointermove listeners set a dirty flag and start
// ONE shared rAF; each frame recomputes state, calls subscribers; when neither
// scroll nor pointer changed for 200ms AND vel < 0.01, draw one final frame and
// stop the rAF. hoverAllowed = matchMedia('(pointer: fine)').
```
`p` needs the hero section rect: expose `registerHeroSection(el)` from the same module. vel = exponential moving average of |Δscroll| per frame, normalized by vh, decayed by 0.85/frame so it settles to 0 (settling counts as "dirty" until < 0.01). No React state per frame; subscribers do direct style/canvas writes.
DoD: unit-testable pure helpers exported (`computeVel`, easing); a temporary dev harness is NOT needed; tsc passes.

**T2. Capability gate upgrade — `src/hooks/useRenderMode.tsx`.**
Keep existing detection and persisted manual override exactly as is. Add: `demoteSession()` on the context: switches mode to `'lite'` for this session only (React state, NOT localStorage — see the file's own comment about not permanently locking browsers out). Add `src/lib/fpsSentinel.ts`: `startSentinel(onDemote)` — subscribes to the scrub bus, samples frame deltas ONLY on frames where `vel > 0.05` (i.e. real animated frames), collects the first 120 such deltas, computes p95; if p95 > 28ms, call `onDemote` once and unsubscribe. Wire it in the Full composition root. On demote, the page swaps to the Lite composition in place (acceptable to lose scroll position by at most the hero: re-scroll to equivalent P).
DoD: manual test instructions: in DevTools, CPU throttle 6x, scroll hero, page demotes to lite within a few seconds of scrolling; no demotion persisted after reload.

**T3. Tesseract refactor — scroll-driven pure function.**
Source: copy `src/components/Tesseract.tsx` from branch `v260720_tesseract-hero` (`git show v260720_tesseract-hero:src/components/Tesseract.tsx > src/components/dreamcore/Tesseract.tsx`) and refactor. That file already has: 4D geometry, normalized fit-scale sweep, DOM vertex labels with anchor flipping and depth scaling, center CTA with circular halo, Swiss-grid morph slots, label/vertex assignments (name antipodal to tagline), mobile sizing. KEEP all of that. CHANGE:
1. Delete `dt`, `lastTimeRef`, and all `+= SPEED * dt` accumulation. Rotation becomes: `angleXW = 0.55 + p * 2.4; angleZW = 0.20 + p * 1.8` (radians; the base constants 0.55/0.20 are the rest pose, chosen so the rest frame shows a clear inner-cube-inside-outer reading; tunable, see §4).
2. Own rAF is replaced by a scrub-bus subscription; all per-frame work happens in the callback. At rest nothing runs (bus guarantees).
3. Hover (only if `hoverAllowed`): eased tilt exactly as currently implemented (spring toward pointer target, max 0.35 rad) PLUS vertex hover: pointer within 28px of a projected labeled vertex lights that vertex's edges (the 3 outer-cube edges + 1 cross edge incident to it) at 2x core alpha and shows its glow at 1.5x for as long as hovered. Tilt easing may run its settle frames after pointer stops (spring settling is a response to the action, allowed; the bus's 200ms grace covers it; if the spring needs longer, keep the bus dirty until |spring delta| < 0.001).
4. The w-flatten mapping changes for the fold (T5): `wMul = cos(PI * clamp(p, 0, 1))` (1 at p=0, 0 at p=0.5, -1 at p=1: the object turns inside out across the hero runway). Edge alpha: full until p=0.55, then fade by `smoothstep(0.55, 0.9, p)` to 0. Label-to-Swiss-grid morph: unchanged logic but driven by `e = easeInOutCubic(clamp((p - 0.15) / 0.85, 0, 1))` so the object gets a beat of pure rotation before text starts migrating.
DoD: at rest zero rAF activity (verify via Performance panel: no frames without input); scroll down and back up scrubs identically (reversible); tsc + build pass.

**T4. Full hero — `src/components/dreamcore/HeroFull.tsx` + standby + power-on.**
Section 200vh, sticky viewport, contains the Tesseract (as T3). Standby: at p=0 render tesseract at `alpha * 0.5`, a CSS vignette overlay (radial-gradient, static), and the name caption; full alpha reached by p=0.12. Power-on tracking glitch across p in [0, 0.08]: a horizontal band offset applied to the canvas via CSS `clip-path` slices + `translateX` where slice offsets are `sin(p * 137.3 + sliceIndex * 71.7) * amplitude(p)` with `amplitude = 12px * (1 - p/0.08)` — deterministic in p, so scrubbing back replays it in reverse. Implemented as 3 stacked clip slices on a wrapper div (CSS vars set from the bus callback), not canvas work.
`src/pages/Index.tsx`: `mode === 'full'` renders `HeroFull`, else existing RED `HeroSection` untouched.
DoD: browser check at p = 0 / 0.04 / 0.3 / 0.75 / 1 matches described states; lite mode unchanged from RED.

**T5. The fold is inside T3's wMul mapping — no separate task; listed for traceability.** Acceptance for the fold: at p=0.5 the wireframe reads as a plain 3D cube; by p=1 inner/outer have exchanged and edge alpha has faded; labels have finished migrating to the Swiss grid (the p=1 layout must remain a fully usable static hero, same slots as the tesseract-hero branch version).

Phase 1 verification (whoever runs it): `npm run build`; then browser: screenshot at rest, mid-scrub, p=1, mobile 375px the same three; confirm reversibility by scrolling down then up and comparing rest frame to initial screenshot; confirm rAF stops at rest (Performance panel, 2s idle recording shows no frames).

---

### PHASE 2 — the room (seams, thread, handoff)

**T6. Seam alignment — `src/components/dreamcore/SeamFace.tsx` + registry in the scrub bus module.**
Contract:
```ts
registerSeam({ id: string, el: HTMLElement, range: [P0: number, P1: number] })
```
One shared 2D canvas overlay (`position: fixed; inset: 0; pointer-events: none;`), drawn only while some seam is in range (bus-driven). Behavior per seam: at P0, capture `el.getBoundingClientRect()`; choose the outer-cube face of the tesseract's CURRENT projection whose projected quad has the highest IoU with that rect (compute once at P0 entry); across [P0, P1] lerp the four projected quad corners to the rect corners with easeInOutCubic; draw the quad edges in the tesseract's edge style (double-stroke bloom, #ff3b52, core alpha ramping 0.0 → 0.7 → 0.0 across the range so the seam appears, locks, releases). After P1 draw nothing.
Seams to register in this phase (2 only): `about-photo` (the about section photo frame, range tuned to the scroll span where the photo is 30..70% visible) and `contact-block` (reserved, activated in T11).
The tesseract's projection state must be readable after the hero: export from T3 a `getProjectionSnapshot()` returning the last projected outer-cube quads; when past the hero (p=1) the snapshot stays frozen at the p=1 projection, which is fine (the seam lerp starts from wherever it was).
DoD: scrubbing through the about section shows the quad appear, align exactly to the photo frame, release; scrub back replays in reverse; canvas idle when out of range.

**T7. ECG thread — `src/components/dreamcore/ECGThread.tsx`.**
Fixed to the left edge (12px in), full viewport height, an SVG path styled like the logo ECG (same red, thin, neon glow via existing CSS shadow utilities). Path geometry: flatline with ECG spikes positioned at each seam/section boundary P value (about, constellation, services, contact: 4 spikes; positions hardcoded as fractions with a comment on how to re-measure). `pathLength=1`, `stroke-dasharray: 1`, `stroke-dashoffset = 1 - P` written directly from the bus. The trace literally draws with scroll and un-draws scrolling up. Hide in lite mode and under 768px (mobile has no room).
DoD: trace length tracks P exactly; spikes land within the visual span of their sections; zero animation at rest.

**T8. Constellation handoff + bloom cherry-pick.**
First: `git cherry-pick f54364f` (edge bloom; 4-line context diff vs this branch, resolve trivially if needed). Then handoff: in the Full composition, wrap the constellation section entry with a scrub-driven crossfade: over the 40vh of scroll before the constellation section top hits mid-viewport, the ECGThread emits a spike (already placed) and the tesseract snapshot vertices (from `getProjectionSnapshot`, drawn into the T6 overlay canvas at their frozen positions, scaled toward the constellation's bounding box) fade 0.5 → 0 while the constellation scrolls in normally. This is a VISUAL garnish layered above; the constellation component itself is NOT modified beyond the cherry-pick. If IoU of effort vs effect turns out poor in review, the garnish may be cut by Sinaida, so keep it in its own small function.
DoD: constellation behaves identically to RED (hover, drag, synth unlock, tooltips: manual smoke test each); bloom visibly brighter; handoff garnish scrubs and reverses.

Phase 2 verification: build + tsc; browser scrub pass over the full page; explicit constellation easter-egg smoke test (drag a star, confirm drone + unlock card).

---

### PHASE 3 — the texture (blobs, glitch, wake)

**T9. Blob previews everywhere — extend RED's system.**
`src/lib/ditherPreview.ts`: add `getSolarizedPreview(src)` alongside `getDitheredPreview`: same load/downsample/cache pattern; pixel op = table solarize per channel (v < 128 ? v*2 : 510-2*v applied to each RGB channel) then a mild red-shift toward the palette (multiply R by 1.15, clamp). Cache separately keyed `sol:{src}`.
`src/components/dreamcore/BlobPreview.tsx`: generalization of `constellation/DitherPreview.tsx` (copy, do not modify the original): cursor-trailing square, adds tracker chrome: `border border-primary/60` + four corner ticks (absolutely positioned Ls OUTSIDE an inner overflow-hidden image wrapper — see the tesseract-hero branch's BlobTracking.tsx fix for the exact structure) + index/title on `bg-background/75` backings.
`src/hooks/useBlobPreview.ts`: `useBlobPreview(items: { el: ref, src, title, style: 'dither' | 'solarize' }[])` wires pointerenter/leave/move; desktop only (`pointer: fine`); renders nothing on touch.
Attach: service rows in `ServicesTerminal` (style: solarize, images: the three `work-*.jpg` mapped by relevance; any service without a natural image gets none) and the about section's project mentions if present. Constellation keeps its own original DitherPreview untouched.
DoD: hover a service row on desktop: preview trails cursor with chrome; touch devices unaffected; each image dithers/solarizes once (cache hit on re-hover; verify via one console.time in dev only, removed before commit).

**T10. Velocity glitch — `src/components/dreamcore/useVelocityGlitch.ts`.**
Bus subscriber that writes two CSS custom properties on `document.documentElement`: `--vhs-noise-opacity: clamp(0, vel * 1.8 - 0.05, 0.55)` and `--tracking-skew: {vel > 0.6 ? sin(P * 977.7) * 3 : 0}px`. Wire the existing `VHSStaticLayer` / CRT overlay (already on RED) to consume `--vhs-noise-opacity` as its opacity multiplier, and the main content wrapper to `translateX(var(--tracking-skew))`. Result: fast scroll = tape noise and slip; slow scroll = clean; rest = zero (vel decays to 0 by the bus). Deterministic in (P, vel): no randomness.
DoD: slow scroll shows no noise; violent scroll shows noise + slip; stopping kills both within ~150ms; reduced-motion/lite never mounts this.

**T11. Wake — contact reassembly.**
Register the `contact-block` seam (T6) with range covering the contact section entry. Additionally, inside the contact section (full mode only), render a small static tesseract rest-frame (one canvas draw at the T3 rest pose, ~180px, alpha 0.5, drawn once on scroll-into-view, never animated) behind/beside the contact CTA so the site ends on the whole object. Reuse T3's projection code via export, not a component copy.
DoD: scrubbing into contact shows seam lock on the contact block then release; the small tesseract renders once and costs nothing after.

Phase 3 verification: full-page scrub pass desktop + 375px; lite mode full regression (must be byte-identical RED behavior except the T8 bloom); build + tsc.

---

## 3. Dispatch plan (tight budget)

| Phase | Agent | Model / effort | Est. | Files owned |
|---|---|---|---|---|
| 1 | one implementer | sonnet / medium (T3 internals: high) | ~40k | useScrubBus.ts, useRenderMode.tsx, fpsSentinel.ts, dreamcore/Tesseract.tsx, dreamcore/HeroFull.tsx, pages/Index.tsx |
| 2 | one implementer | sonnet / medium | ~35k | dreamcore/SeamFace.tsx, dreamcore/ECGThread.tsx, scrub bus (additive), cherry-pick, Full composition |
| 3 | one implementer | sonnet / medium | ~35k | lib/ditherPreview.ts (additive), dreamcore/BlobPreview.tsx, useBlobPreview.ts, useVelocityGlitch.ts, ServicesTerminal (attach only), contact wiring |
| commits | haiku after each phase | ~5k | git only |

Rules: one GitHub issue per phase pointing at this spec file section (`gh issue create` with body "Execute docs/spec-dreamcore-tesseract.md PHASE N. Invariants in §0 are binding."). Verification per phase by the orchestrating session with the Browser pane (or by Sinaida eyeballing localhost if budget is critical). Escalate a failed task to sonnet/high before anything else; never to opus without Sinaida's OK (budget).

## 4. Tunables (change these first when the feel is off)

| Constant | Where | Default | Feel note |
|---|---|---|---|
| rest pose angles | T3 | 0.55 / 0.20 | rest frame must read as cube-in-cube at a glance |
| rotation span | T3 | 2.4 / 1.8 rad per runway | more = more turn per scroll; keep XW:ZW ratio ~4:3 |
| fold curve | T3 | cos(PI*p) | if the inside-out moment reads muddy, hold wMul=0 across p 0.45..0.55 |
| label morph window | T3 | p 0.15..1.0 | earlier start = calmer; later = more dramatic |
| glitch thresholds | T10 | 0.05 / 0.6 | raise if trackpads trigger noise on gentle scroll |
| sentinel budget | T2 | p95 > 28ms over 120 frames | loosen to 33ms if demoting mid-tier laptops |
| power-on window | T4 | p 0..0.08 | longer feels more VHS, shorter snappier |

## 5. What NOT to build

No sound (synth easter egg stays the only audio). No new fonts, no new sections, no route changes, no autoplaying anything, no scroll hijacking (native scroll only, the page must scroll normally with the wheel/finger at 1:1). No WebGL for the tesseract. No changes to Collaborate/WorkCase/privacy pages. Mobile gets the same scroll-scrubbed hero (no hover features) and NO ECGThread; if Phase 1 mobile perf is poor, mobile full-mode falls back to lite composition rather than degrading the mechanic.

---

## 6. PHASE 1.5 — wow pass (Fable design judgment, 2026-07-20, post-minimal-build)

Findings from live review of commit 9e5b569, forced full mode, desktop 800px viewport. Ordered by wow-per-token. One sonnet/medium agent, est. ~25k. Invariants §0 binding.

**W1 (bug, blocking): cold-load blank canvas.** On fresh page load the tesseract does not paint until the first scroll; labels float in empty space. The getScrubState initial-paint fix does not cover the cold path (likely canvas sized 0 or registration order at mount). DoD: hard reload → wireframe visible at rest with zero input.

**W2 (math, the wow moment): the fold collapses to a sliver.** At p≈0.5 the object degenerates into a narrow vertical prism instead of reading as a plain 3D cube. Cause: wMul is applied to w BEFORE the 4D rotations, so at wMul=0 the XW rotation gives x' = x·cos(angleXW) ≈ −0.18x at p=0.5 — the x axis is crushed. Fix: rotate the full 4D point first, then flatten the ROTATED w by wMul before projection. If the inside-out moment still reads muddy, additionally hold wMul=0 across p 0.45..0.55 (§4). DoD: at p=0.5 the wireframe reads as a volumetric cube; the inner/outer swap across p 0.4→0.6 is legible.

**W3 (choreography): mid-scrub text collisions.** The center name overlaps migrating labels; the tagline "Visual worlds for physical spaces" and an empty CTA border box collide with labels/object mid-runway. Fix: tagline opacity = smoothstep(0.82, 0.95, p) (absent during the ride, arrives with the grid); center name + CTA fade out over p 0.15..0.3 and the name re-enters as part of the p=1 grid (it already has a slot). Nothing may occupy the center band y 35..65% during p 0.3..0.8 except the object.

**W4 (composition): p=1 is a left-edge stack, not a Swiss grid.** Current end state: small labels in one cramped left column, dead right half, and the standby caption collides with the SIN AI DA header logo. Fix per the owner's layout rule (Swiss grid + oversized type): tagline set oversized (existing display classes, clamp to ~2 lines), labels distributed on the grid in two columns with generous leading, remove the top-left duplicate caption entirely whenever the header logo is visible (it is redundant at every p). No new copy, no new fonts.

**W5 (polish, optional if tokens remain): standby presence.** Rest frame is good (cube-in-cube reads clearly). Raise standby edge alpha from 0.5 to 0.65 so the first frame carries more weight against the vignette. Single constant.

Out of scope for 1.5: everything cut from Phase 1 minimal (hover, power-on glitch, sentinel), Phases 2–3, mobile-specific work (re-verify 375px only as regression). Verification: browser pass at p = 0 (cold load) / 0.5 / 1, plus lite-mode regression.
