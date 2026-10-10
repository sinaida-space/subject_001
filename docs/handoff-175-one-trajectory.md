# Handoff: one trajectory (#175 follow-up), 2026-10-10

Branch `261010_quote-gate`. Read `docs/idea.md` first: one galaxy brings all the content, one flight carries the visitor.

## Done in #175

- Stars and cursor back to live (red arrow, pointer-lit stars); torch and beam trail removed.
- `src/lib/flight.ts`: page progress 0..1 gives x (eased glide), y (linear), z (dive in five surges). `ParticleField flight` turns it into the camera: glides left so stars stream left to right, sinks, dives; scroll speed widens the lens (+14°) and banks the camera (0.05 rad). The field wraps around the camera, so the dive never empties. Constants at the top of ParticleField (`FLIGHT_*`).
- Star titles are a far layer at 0.3 of scroll speed (`PARALLAX = 0.7` in StarTitle, `TITLE_LAG` in WorkBuild after the pour lands). Lite titles lag while they come in, capped, on one left axis with the rule to the right.
- Body of Work: square cards, a wheel-driven pinned strip in every mode, reading direction (cards come in from the right).
- Services: three offerings, STAGE (Redkie Ptitsy), SCREEN (Aether Currents), SPACE (CONSPACE ROOMS). Tesseract has three cells: the entry falls into the surface from the left, turn one swings to the side (`TURN_DX`), turn two rises (`TURN_DY`), the exit leaves to the right.
- Phone and desktop hero: the belief stays hidden over the hero until the gust (#174 regression).

## Next: the bursts and the bending path

Her brief: when a section bursts, exactly those pixels swirl, or the camera moves somewhere and we find the Body of Work sphere. Weird trajectories are welcome; one path, one galaxy.

Recommended motion, to mock before touching src (see memory: mock first):

1. **The swirl is the bang.** In WorkBuild, the About cells open out today in a straight radial burst. Replace the radial path with a spiral: each cell turns around the screen centre with angular speed falling off with radius (a galaxy's differential rotation), so the burst reads as a nebula winding up. Pure function of scroll, monotonic angle, rewinds exactly.
2. **The camera banks into it.** At the same scroll window the flight peaks its bank and its sideways glide (a local surge in `flightAt`, keyed to the bang's scroll range via a bus like `workBuildBus`), so the stars behind stream around the swirl in the same direction. One motion, two layers.
3. **The sphere is the swirl's core.** As the spiral tightens, the cells that land on the globe arrive along the spiral arms, not on straight lines. The globe then reads as the galaxy condensed into the work.
4. **Same treatment for the Services and Contact seams**, once the first one is approved: into the surface (Services), along the bend (Contact).

Checks: reverse scroll rewinds, one-breath seams, 60 fps on a 5-year-old laptop, nothing moves at rest.

## Open for her

- The swirl mock above.
- The footer city mock below.

## Footer direction (proposed 2026-10-10, not built)

The footer is the city the stars came from: the grounding under the sky. Stars fall into the last screen and land as lit windows. The three link columns are towers built from window cells in the site's dither, set front-on on the Swiss grid (no isometric view, which reads as a stock synthwave trope). The ECG logo is the one neon sign, on the tallest roof. The camera dolly-zooms out from street level until the skyline is small and its windows read as a constellation. Then the windows breathe light upward into the sky: the universal source is people, and the stars over the page came from these lights. Hovering a link lights its floor. Canvas 2D cells in the galaxy palette, no three.js buildings; it has to run on a 5-year-old laptop. Mock a still first.

Also landed after this handoff: titles hold mid-screen and condense from the fog with their section's presence (StarTitle), Body of Work is a StarTitle and the bang pours only into the globe (`TITLE_POUR = false` in WorkBuild), header links jump via `src/lib/navLand.ts`, the hypercube swings oblique mid-turn (`TURN_YAW`, `TURN_PITCH`), and the cursor is red in lite too.
