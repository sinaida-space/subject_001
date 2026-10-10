# Handoff: the last screen (#179), 2026-10-10

Branch `claude/confident-wozniak-jmydhl` (pushed, no PR yet). Tracking issue #179. Read `docs/idea.md` first (one galaxy, one trajectory), then `docs/handoff-175-one-trajectory.md` for the flight.

She works with the Mahler protocol (`/mahler`): interrogate with AskUserQuestion, short PRD in chat, wait for approval, then build. Budget is tight: Solo mode, Opus only, spawn agents only for cheap mechanical work. She runs the branch locally (`npm run dev -- --host` inside the repo) and judges by eye on desktop and phone.

## What is on the branch

1. **Star titles** (`StarTitle.tsx`, 5bc3cec): centred on the viewport both ways; `clear` prop makes CONTACT thin away before the footer's top reaches the word. She was happy with this.
2. **Footer v1** (01c1dd7, superseded): towers made of link floors with window strips, ECG ground line. She rejected the strips and the ground line ("cool but mean nothing").
3. **Footer v2 "looking down"** (9a2a3ae, current):
   - `src/lib/city.ts`: one progress `f` (0 as the footer enters, 1 at page end), timing in `CITY`, `cityCamera(f)` (sink, lift with the pour, then pitch down to the horizon, thin stars under eye level), `buildCity` (tower cells + falling sky starts + rising grains + pour cells), `cityBus`.
   - `CityGround.tsx`: ~9000 static points on a plane under the last eye height: street grid, avenues, block windows, a dark river; lights come on near-first.
   - `CityLights.tsx`: one shader point cloud, screen-glued: tower windows falling from the sky, grains rising, the pour (glyph cells flying from Contact's links to the footer's).
   - `Footer.tsx`: `CityFooter` (home, full mode, no reduced motion). Wide: sticky 100svh screen + `CITY.runway` (0.9) screens of scroll; sky with `ContactLinks` top-left, bottom row = old Logo + tagline, the tower strip, the three plain columns, bottom bar. Narrow: same pieces stacked, towers as a strip. `CalmFooter` everywhere else.
   - `ContactLinks.tsx`: EMAIL ME + Book a call, shared by Contact and the footer sky. Contact's row now has only these two (Instagram, LinkedIn live in CONNECT).
   - `ParticleField.tsx`: camera pitch (`cam.pitch`), stars under eye level fade (`uEye`, `uBelow` in the star shader hook), mounts `CityGround` and `CityLights` in flight mode. `flight.ts`: the flight ends where `footer[data-city]` enters.

Checks at 9a2a3ae: `npm run build` passes, vitest 8/8, eslint no errors, tsc has the 5 errors already on main.

## Her feedback on v2 (do these next)

Screenshot showed the final frame on her Mac.

1. **Bloom halo again.** A grey soft blob sits around the little towers (and faintly under the columns). Cause: the scene's single `Bloom` (`luminanceThreshold 0.02`, intensity 2.2, mipmap blur) blurs every bright additive point; the dense lit tower windows become a cloud. Fix options, best first:
   - render the screen-glued layer (`CityLights`) outside the bloom: a second small R3F canvas or a Canvas2D overlay above the field, so windows and the pour stay crisp; or
   - selective bloom (postprocessing `SelectiveBloom` / layers) that excludes `CityLights` and dims `CityGround`;
   - at minimum raise the threshold for city points by lowering their alpha.
2. **The contacts lost their text.** "EMAIL ME" and "Book a call" mean nothing alone. The sky block must carry the whole call: *Got an idea that should be seen, heard, and felt?* / **LET'S TALK.** / the two links. Simplest honest version: the Contact section's content *is* the sky of the last screen (pour the question + headline + links together, or merge Contact into the footer's held screen and drop the separate pour). Keep the CONTACT star title fix working.
3. **More zoom.** She loves the star field and the city lights; wants a stronger camera move. Ideas: a real dolly (camera backs off and rises while the lens narrows, so the city plane opens out under you), or push the fall deeper before the tilt so the horizon arrives with more speed. Keep: pure function of scroll, rewinds, still at rest.
4. **The little towers feel off.** "I want all elements to be functional; this is just a thing." Decorative towers are out unless they do something. Options to put to her: drop them and let the city lights carry the image; or make a city element functional (e.g. lights of the city spell or point to something, a lit district per link column that responds on hover, the river as the divider between nav and contact). Ask before building.

## Constraints that held all along

- Motion law: nothing animates without scroll/hover/click; reverse scroll rewinds; nothing moves at rest (the CRT overlay flicker is the sanctioned exception).
- 60 fps on a 5-year-old laptop; one extra draw call per layer, no per-frame CPU over point arrays.
- Links stay real DOM, focusable, readable; text never sits on dense lights.
- One red; no idle flicker; no isometric/synthwave tropes.
- Headless screenshots (Playwright + swiftshader, `--use-angle=swiftshader`) run at a few fps, so damped camera values lag; wait 2-3 s per shot and set `html{scroll-behavior:auto}`. Force full mode with `localStorage['sinaida:render-mode']='full'`, dismiss cookies with `localStorage['cookie-consent']='declined'`.

## Open judgment calls

- Red mast light on the tallest tower (`antenna` in `stripTowers`) — moot if towers go.
- `CITY.runway` length (0.9 screens) and the final pitch (`TILT` 0.17 rad).
