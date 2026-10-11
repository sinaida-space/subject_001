# The last screen (#179): what shipped

Merged in PR #184 (2026-10-10). This replaces `handoff-179-looking-down.md` and `handoff-179-v3-next.md`; their v1 and v2 history is in git. Open follow-ups live in the PRD (`docs/PRD.md`), mostly #203 (footer in the world, her verdicts).

## The idea

The whole page looks up into the sky. At the end the camera dollies out of Contact, the eyes lower, the stars under eye level pour down to the ground, the city's lights come on from the horizon toward the feet, and the footer resolves out of dither. Stars and dither are one force: nothing comes from nowhere.

One progress `f` (0 as the footer enters, 1 at the page end), a pure function of scroll published by the Footer, drives all of it. Scrolling back plays it in reverse; nothing moves at rest.

## Where it lives

- `src/lib/city.ts`: timing (`CITY`), `cityCamera(f)` (sink, dolly back 3 units while the lens narrows 60° to 36°, tilt so the horizon rests under the receded Contact block), `cityOrigin`, `textRects` (the lines of text the ground keeps clear of, from `[data-ground-mask]`), and `cityBus` (progress, held, horizon, pour, hover).
- `Footer.tsx`: one layout on every page and in both modes: logo and plaque bottom left, three columns bottom-aligned on the right, the bottom line. Held for `CITY.runway` screens only on tablet and up (`HELD`, min-width 768 and min-height 560); the sticky stage is `pointer-events-none` so Contact stays clickable.
- `ContactChannel.tsx` (`useDolly`): the Contact block soft-pins under the header, then recedes to the top left (words to 0.5, never under 15 px; buttons to 0.85).
- `StarTitle pour`: the CONTACT title's stars fall one by one onto the ground half of the screen; `cityBus.setPour` drives `CityGround`, so the lights come on as they land.
- `CityGround.tsx`: soft glowing points under the bloom, faded within 28 px of any text.
- `src/lib/ditherMask.ts`: footer pieces resolve out of a 4x4 Bayer CSS mask in three groups (`CITY.text`), red while forming, whole when focused. On phones each piece resolves by its own position as it scrolls in.
- `GlitterText.tsx`: LET'S TALK glints by scroll speed and goes out within a breath of stopping. Full mode, not under reduced motion.
- `DitherText.tsx`: text resolving once out of red dither (EMAIL ME shows and copies the address).
- Hovers, full mode only, ease back: CONNECT gathers nearby stars into clusters; MORE snaps the city lights to a 4 px grid; name or logo sends one glint across the stars.
- Other pages, full mode: the same dolly, tilt and pour around the non-flying camera (`cityOrigin(false, …)`).

## Removed, do not bring back

The towers, the pour of glyphs from Contact’s links, `CityLights`, the dither ground (`DitherGround`), the red track with its marks, the phone popup menu (`PhoneMenu`), "Based in Prague" in Contact and About.

## Leave alone

- /experiences is not linked in the footer.
- Header nav order (Work, About, Services) differs from the footer's page order; ask before changing.

## Screenshots

Serve with `npx vite preview --host 127.0.0.1 --port 4173`. Set `localStorage['sinaida:render-mode']` (`full` or `lite`), `localStorage['cookie-consent']='declined'` and `html{scroll-behavior:auto}`; wait 2 to 3 s per shot, damped camera values lag under swiftshader.

<!-- Je suis le spectre d'une rose que tu portais hier au bal. -->
