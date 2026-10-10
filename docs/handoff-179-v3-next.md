# Handoff: the last screen, v3 (#179), 2026-10-10

Branch `claude/confident-wozniak-jmydhl` (pushed, no PR). Read first: `docs/idea.md`, then `docs/handoff-179-looking-down.md` (v1/v2 history and the full v3 plan under "v3: the approved plan").

Her protocol: questions via AskUserQuestion, a short PRD, wait for approval, then build. She runs `git pull` + `npm run dev -- --host` and judges by eye on Mac and phone. Solo mode, budget tight. Show screenshots before claiming done.

## Done (on the branch)

- One footer on every page and in both modes (`Footer.tsx`), her layout: logo + plaque bottom left, three columns bottom-aligned on the right, bottom line = `PRAGUE` / `© year · Designed and coded by Sinaida Krivchenko` + the question. Navigate in page order, "Privacy", no ↗ under Connect.
- Phones: `PhoneMenu`, NAVIGATE · CONNECT · MORE in one row; a tap opens that group ABOVE the row (flex-col-reverse, DOM keeps buttons first), links resolve out of dither.
- Home footer is a full last screen in both modes; on wide full mode it holds `CITY.runway` screens and publishes progress via `cityBus.setProgress`.
- `DitherText.tsx`: text resolving out of red dither (2 px cells, 4x4 Bayer), once per text. EMAIL ME (`ContactLinks`) shows the address with it and copies it ("Copied"); mailto still opens.
- Contact: `overflow-x-clip` so the lite title is no longer clipped as it comes in. "Based in Prague" removed. About has NO location row (she hated it).
- Towers, pour, `CityLights` deleted; `city.ts` is camera + progress only. Build stamp lives in the console egg (`__BUILD__` in vite.config).

- **The bending flight** (0eed1e2): `flightPose(p)` in `src/lib/flight.ts` is a centripetal Catmull–Rom curve through a waypoint per chapter (S-bends: `SWING`). The camera turns its head into the swing off the diagonal (`LOOK`, `MAX_YAW` 0.3, `MAX_PITCH` 0.12), banks with the turn rate (`BANK`), and settles straight at both ends (`SETTLE`), so the footer hand-off is unchanged. ParticleField uses rotation order YXZ. Waiting for her to judge it by eye; tune `SWING` and `LOOK` first. Commit 2's track could trace this same curve.

## In progress, in her order

### Commit 2: the home scene (full mode)

Her verdict on the first build (phone screenshot): the screen is fine, but the red track line and the dither ground "break the theme"; she wants stars pouring down and the city. Lite looked empty at the end, and the phone popup menu was "a catastrophe". So, now:

- **Held only on tablet and up** (`HELD` = min-width 768 and min-height 560 in `Footer.tsx`). `cityBus.setHeld` tells Contact. The sticky stage is `pointer-events-none` so Contact stays clickable under it.
- **Dolly out of Contact** (`useDolly` in `ContactChannel.tsx`): the block (question, LET'S TALK, links) soft-pins under the header, then recedes top left. Words go to 0.5 (the question never below 15 px) and the buttons to 0.85. The camera backs away 3 units while the lens narrows 60° → 36° (`cityCamera`, `CITY.dolly`). Contact publishes where its receded block ends, and the final tilt puts the horizon just under it (`cityBus.setHorizon`, `restTilt`).
- **Stars pour, the city lights**: under eye level the stars drop to the ground in the star shader (`uFall`, `CITY.fall`), the lower ones first, and settle dim. `CityGround` (soft glowing points, under the bloom) comes on from the horizon toward the feet (`CITY.ground`) and fades within 28 px of any text (vertex-shader masks from `textRects` in `city.ts`, which reads the `[data-ground-mask]` elements, one per line of text).
- **Out**: the dither ground, the red track and its marks, the Navigate hover. `DitherGround.tsx` is deleted. Don't bring them back.
- **Footer resolves out of dither** (`src/lib/ditherMask.ts`): 17 Bayer CSS-mask tiles, scrubbed by f in three groups (`CITY.text`), red while forming, whole when focused. Unformed pieces don't clear the lights.
- **Phones keep the live sinaida.eu layout**: logo + plaque, then Navigate | Connect in two columns with More under them, a divider, the bottom line. `PhoneMenu` is gone. Not held, no recede; the stars still pour into the lights as the footer scrolls in.
- **Lite**: the footer has its natural height again (no `min-h-[100svh]`), and Contact's bottom padding and the footer's top padding are tighter on md+, so the end of the page shows all of LET'S TALK above the footer.

### Commit 3: hovers and other pages (the track and the MORE dither hover are out with the dither ground; re-ask her before building hovers)
- CONNECT hover: nearby stars pull into small clusters. MORE hover: the ground's dither sharpens to a finer grid. Name/logo hover: "extra bling", a glint passes through the stars. Full mode only, rewind on leave, nothing moves at rest.
- LET'S TALK laced with star points that glint only while scrolling (MySpace-glitter memory, keep it neat).
- Other pages, full mode: same footer with stars, dolly and dither ground; no LET'S TALK, no track. Lite: same layout, still.

### Open / leave alone
- /experiences: do NOT link it in the footer (unclear with Dasha).
- Header nav order is still Work, About, Services; footer is page order. Ask before changing.
- Collaborate page's EMAIL ME has no reveal.

## Constraints
Motion law (scroll/hover/click only, rewinds, still at rest; CRT flicker is the exception). 60 fps on a 5-year-old laptop, one draw call per layer, no per-frame CPU over point arrays. One red. Links stay real DOM. Text never on dense lights.

## Checks and screenshots
`npm run build`, `npx vitest run` (8 pass), `npx eslint src` (0 errors), tsc has the 5 errors already on main. Headless shots: Playwright in a scratch dir with `executablePath` = `/opt/pw-browsers/chromium_headless_shell-1194/*/headless_shell`, `--use-angle=swiftshader`; serve with `npx vite preview --host 127.0.0.1 --port 4173`. Set `localStorage['sinaida:render-mode']` and `localStorage['cookie-consent']='declined'`, `html{scroll-behavior:auto}`, wait 2-3 s per shot. Don't `pkill -f "vite preview"` inside the same shell command (it kills itself).
