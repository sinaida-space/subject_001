# Handoff: spacewalk, 2026-10-08

Read this first in the next session. It covers what is live on `main`, what was tried and rejected, and what is open.

## Merged to main (branch `261008_spacewalk`, issue #119)

Dark (full) mode only. Lite renders exactly as before.

**Constellation dives** (`src/components/dive/`, `src/lib/diveBus.ts`)
- Clicking a work star throws a red projector beam from the star. The cone's apex stays pinned on the star while its far end opens up to the card's size, then the ProjectDetail card rises out of the effect. Closing the card plays the same frames backwards into the star.
- Each work has a fixed `dialect` in `src/data/projects.ts`: `crt` (stage: Redkie Ptitsy, Stereolove), `dither` (image: The Eyes Chico, CONSPACE ROOMS, Ethereal Path), `ascii` (code: Aether Currents, Storm Glass, Infinite Voidsong). The dive wall speaks that dialect.
- The card hand-over point is `DIVE_LAND_AT = 0.62` in `diveBus.ts`.
- The dive is red on void only. Bright parts burn to hot red, never white.
- Do not call `WEBGL_lose_context.loseContext()` anywhere. On macOS Chrome it blanks the whole window white for 1–2 frames. That was the white-flash bug, found from a screen recording.
- Case pages (`/work/:slug`) also have `▼ DEPTH 02` (process floor via `?depth=2`) and red threads to connected works through shared skills. Browser Back reverses each hop.

**List under the constellation** (`PlainSignalIndex.tsx`, `ProjectDetail.tsx`, `cardBuild.ts`)
- Clicking a row plays the “projection screen”: the row's title lifts off and flies to the card's titlebar, and the row's rules extrude into a lit throw. The card lands tilted and dim, then flattens and brightens.
- The card then builds up in a **random look per click**, never the same twice in a row: CRT lock, dither develop from the image side, or raster dither top to bottom. The glyph (ASCII symbols) build was rejected. Closing reverses the look it opened with.
- Index rules now align edge to edge (the wrapper takes the `-ml-3` hover inset).
- The previous variant (throw without build-up) is kept on branch `261008_card-throw-v1`.

**Performance (Chrome measured, Safari only reported slow)**
- No SVG blur filter or CSS `filter` on the card per frame (Safari repaints those). Glow comes from a wide faint stroke, and dimming from a black veil fading off.
- The dive renders at 1.5× density.
- Hover previews and video posters (960x540) are dithered while idle, so the first hover or card open never dithers on the main thread.
- Measured: card open max frame 167 ms → 25 ms; dive max frame 39 ms (shader compile and texture upload at click). Scrolling holds a steady 60 fps.
- Dither cells are 3 css px everywhere. `DitheredThumb` dithers at 2× the shown size and stays hidden until ready, so a raw poster never flashes.

## Rejected (do not pitch again)

- Faint red wireframe “mind chambers” behind sections (#118, rolled back): they read as a debug grid behind text.
- The tesseract constellation: “limiting” compared with the flat one.
- The universe draft with a large portrait.
- The ASCII glyph build-up on cards.
- Puzzle/hidden-layer gimmicks (owl word trail, slow-scrub frames, selection ink, console floor).
- The DEPTH corner readout.

## Open

- **#120 Horizon line → CRT shutter → About:** the red line between hero (“Visual worlds for stage & screen”) and About (“The story so far / Human first”) should split into red stripes that open onto About with intricate, usable motion. No spec written yet. She liked the CRT stage-door draft. No big portrait.
- **#121 Molecules as synapses:** the molecules stay as hidden mechanics between sections; firing, not explained. No spec yet. Use her inspiration image (red neon wireframe corridor), but never as a static grid behind text: it must glow, have depth, and move with scroll.
- **#122 Final review** of the full spacewalk diff (Sonnet, high effort).
- **#106 Screen-reader pass (parked):**
  - Partial `AboutSection.tsx` sr-only work is in `git stash` as `106-partial-AboutSection`.
  - The auto-mode classifier blocked the agent's edits to `vite.config.ts` (`sourcemap: true`, chosen public by Sinaida) and to `ScrambleText.tsx`. She must approve those edits herself.
- **#114** is the umbrella for the signature moment. Drafts live on branch `261007_p0-closeout-stage-door-drafts` under `drafts/` (stage-door, scroll-opening, hero-about, case-dive, rabbit-hole, tesseract, universe). That branch has no PR yet.
- Safari has not been checked after the perf pass. Ask her, or record a Web Inspector timeline.
- An unexplained reverse dive played once after a page reload while testing. It was not reproduced.
- `npm run lint` fails on 69 old errors (no-break spaces typed inside TSX code, plus a `require()` in `tailwind.config.ts`). New code lints clean. Worth a separate cleanup branch.
- `screenrec.mov` (her recording) sits untracked in the repo root. Do not commit it.

## Working notes

- Always present new visual ideas as drafts first. Her verdicts are fast and blunt, so show before building into `src/`.
- Verify motion numerically when the preview pane cannot capture it. Useful tricks:
  - Sample the dive canvas with `preserveDrawingBuffer` patched in, to count white pixels per frame.
  - Log rAF frame times.
  - A temporary `__freezeP` hook in the throw `frame(p)` gives a frozen frame. Remove it before committing.
- The preview pane throttles rAF when hidden, so screenshots of motion are unreliable.
