# Universe scroll: scope, 2026-10-08

Goal: the homepage reads as one flight through space. Every seam between sections is a scrubbed, reversible moment driven by scroll only (motion law: nothing moves without user action). Dark (full) mode only; lite and reduced motion render the page as it is today. Content stays real DOM at its current size, so text is readable, selectable and reachable by screen readers at every scroll position.

Work one task at a time on its own branch, one commit per step so any step can be reverted; she judges each step live before the next.

## 1. Horizon gate: hero to About (#120), branch `261008_horizon-gate`

- The red horizon line under the hero heats to neon as it rises.
- At about 80 % of the viewport a second line splits off and travels down: a CRT power-on, the two lines are the top and bottom edge of a screen opening.
- Between the lines About is revealed. The lower edge is a band of 3 px Bayer dither cells (site rule), so the screen develops cell by cell with faint phosphor scanlines that fade out as it completes.
- The portrait first appears as a 1-bit red dither (the dive dialect), then dissolves into the real photo.
- Final state is exactly today's About. Scroll back and it plays in reverse.
- One fixed WebGL2 canvas, drawn only on scroll frames while the gate is on screen; replaces the DustReveal canvas at the horizon, so the context count stays the same.

## 2. Universe transit between sections (#121)

- A small `spaceBus` publishes seam progress (0..1) for each band between sections.
- ParticleField reads it: crossing a seam pushes the camera forward through the star layers (warp streaks scaled by scroll velocity, never on a timer).
- Each molecule (dopamine, serotonin, oxytocin) is the gate of its seam: it fires like a synapse as you pass (#121), its bonds lighting in sequence with progress, and its glow throws depth into the next section.
- Her neon corridor reference informs the light, never as a static grid behind text.

## 3. Constellation volume

- Looks exactly as now at rest: the flat layout is the front view of a sphere.
- Dragging empty space turns the field as a 3D object: each star gets a depth from its distance to the centre, rotation reveals parallax, near stars grow and brighten, far ones dim. Rotation is clamped (about ±55°) so nothing passes behind.
- Labels always face the viewer and keep their size floor; on release the field springs back to the readable home view.
- Dragging a star still moves the star and plays the synth (#126 merges first: `261008_mobile-constellation-labels`).

## 4. Close out

- #122 review of the full diff (Sonnet, high).
- #106 screen-reader pass (needs her approval for `vite.config.ts` and `ScrambleText.tsx`).
- Safari timeline check of all three tasks.
