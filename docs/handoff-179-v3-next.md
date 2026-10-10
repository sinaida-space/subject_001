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

## Not done (the actual wow), in her order

### Commit 2: the home scene (full mode)
1. **Dolly out of Contact.** As you scroll past Contact, the camera pulls back while the lens narrows; the Contact block recedes on z to about half size and stays top left, clickable (her screenshot layout: question, LET'S TALK, buttons in the sky). CONTACT star title clears. "3D motion action wow, in the vibe of the project."
2. **The grounding.** Replace `CityGround` with a dither ground: stars fall below eye level and snap onto a 4x4 ordered-dither dot grid, growing from the vanishing point. Keep the moving shimmer she loves on the current lights (sub-pixel glints only while moving, still at rest). Sparse under text.
3. **The track.** One red line on the ground with four star marks (About, Work, Services, Contact), no labels. Hovering a Navigate link lights its mark. She loved this.
4. Logo, columns and bottom line resolve out of the same dither as the scroll reaches them (`DitherText` or a shared shader).
5. **Bloom/dither coherence (she insists):** dither = matter, bloom = light, never both. Ground and track render after the bloom pass (second scene rendered in `useFrame` after the composer, or selective bloom), so the grey halo never returns.

### Commit 3: hovers and other pages
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
