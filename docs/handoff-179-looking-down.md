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

## v3: the approved plan (PRD v4, 2026-10-10)

Her answers replaced the city. Decided:

- **One dither, one bloom.** Dither is matter (4x4 Bayer, 2 css px squares, white and the one red): the ground, text forming or leaving. Bloom is light: stars and glints only. Ground and track draw after the bloom pass, so the grey halo cannot come back.
- **Home, full.** Contact stays its own section; LET'S TALK laced with star points that glint only while moving (the shimmer she liked on the city lights, her "first MySpace coding"). Then a dolly out: the Contact block recedes on z (about half size, stays clickable, top left), CONTACT clears; under the horizon stars fall and settle into dithered ground growing from the vanishing point; logo, columns and bottom line resolve out of the same dither. **The track**: one red line, four star marks (About, Work, Services, Contact), no labels; hovering a Navigate link lights its mark.
- **Hovers (full only, rewind, still at rest).** CONNECT: nearby stars pull into small clusters. MORE: the ground's dither sharpens to a finer grid. Name/logo: a glint passes through the stars.
- **Other pages.** Full: the same footer with stars, dolly and dither ground; no LET'S TALK, no track. Lite: same layout, still.
- **Out:** Prague anywhere in the footer, the towers, the pour, Experiences in the footer (unclear for now), a build stamp in the footer (it is in the console egg).

Build order: commit 1 (layout, text, dither text, email reveal), commit 2 (home scene), commit 3 (hovers, other pages' 3D footer).

### Commit 1 (done)

- `Footer.tsx`: one layout everywhere, both modes, her screenshot: logo + plaque bottom left, three columns bottom-aligned on the right (lg: cols 6-12), bottom line `© year · Designed and coded by Sinaida Krivchenko` + the question. Navigate in page order, Privacy, no arrows under CONNECT (sr-only "opens in a new tab"). Home full on wide screens still holds `CITY.runway` screens and publishes f via `cityBus.setProgress`.
- `CityLights.tsx` deleted; `city.ts` keeps only the camera (sink, tilt) and the progress bus. `CityGround` still mounts as the interim ground until commit 2 replaces it with the dither ground (it sits under the columns for now).
- `DitherText.tsx`: text resolving out of red dither, once per text, then crisp DOM. Reusable for the footer's assembly.
- `ContactLinks`: EMAIL ME shows the address (DitherText) and copies it, "Copied"; mailto still opens (`ObfuscatedMailto` `onOpen`). Contact lost "Based in Prague"; About gained **Current location: Prague. Working globally.**
- `vite.config.ts` defines `__BUILD__` (date · short sha), printed in the console egg in `main.tsx`.

### Commit 1b: her phone feedback (done)

- Phones get a second-level footer menu (`PhoneMenu` in `Footer.tsx`): NAVIGATE · CONNECT · MORE in one row; a tap opens that group above the row in two columns (visual order only; the DOM keeps buttons first), links resolving out of dither (`FooterLink dither`). One group open at a time. Tablet and up keep the three columns.
- The home footer is a full last screen in lite too (`min-h-[100svh]`, content at the bottom), so the page never ends on LET'S TALK cut under the header; full on wide screens is still the held screen.
- Contact clipped its own lite title while the title ran ahead upward (the section was `overflow-hidden`); now `overflow-x-clip`, so CONTACT shows before LET'S TALK as you scroll in.
- She loves the lights field on the phone: keep the shimmer when commit 2 turns it into the dither ground.
