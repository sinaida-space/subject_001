# sinaida.eu v3 — Signal Chain (execution spec)

Issue-first spec doc, standing in for GitHub issues until `gh auth login` is run (see bottom).
Each task below is self-contained: an implementer should be able to execute without opening
files beyond what's referenced here.

**Governing rule for every task (motion law):** no animation may start or continue without a
user action. Scroll position drives motion on touch/mobile; pointer movement drives it on
desktop (`pointer: fine`). No `setInterval`/timer-driven visual change, no idle rAF loops that
animate on their own once mounted. An IntersectionObserver may *start listening*, but must not
itself cause motion — only a subsequent scroll/pointer event may.

**Known violation to fix (found during spec-writing, applies to Task 2):**
`src/components/constellation/ConstellationFull.tsx` currently runs a continuous rAF loop that
animates node "breathing" drift every frame purely from `performance.now()` (lines 213–214),
plus a random idle pulse every ~2.4s (197–201) and a random flatline glitch every ~14s+
(191–195) — all three fire with zero user input, the moment the section scrolls into view.
This must be removed/converted per Task 2.

---

## Task 1 — Shell reconciliation: nav, BODY OF WORK, remove mode toggle
**Model:** sonnet · **Depends on:** — · **Parallel with:** 4, 8

**Goal:** Header nav has all four sections, the works section is retitled, and the manual
MAP/PLAIN-SIGNAL toggle is gone (map + plain index will coexist per Task 2 — this task only
removes the toggle UI, not the underlying `useRenderMode` detection).

**Files:**
- `src/components/Header.tsx`
- `src/components/constellation/Constellation.tsx`
- `src/components/constellation/LegendWindow.tsx` (delete)
- `src/data/graph.ts` (`CATEGORY_COLORS` — see contract)

**Steps:**
1. In `Header.tsx`, `NAV_ITEMS` (line 5–8): add `{ label: 'Services', href: '#services' }` and
   `{ label: 'Contact', href: '#contact' }`. Order: Work, About, Services, Contact. (Contact
   already exists as a standalone CTA button — keep that button too; the nav link and the CTA
   button can coexist, or fold the CTA into the nav and drop the separate button. Your call,
   but the mobile menu list must also gain Services + reflect the same order.)
2. Remove the desktop MAP/PLAIN SIGNAL toggle block (lines 67–92, the `role="group"` div) and
   the mobile `VIEW:` toggle button (lines 180–198). Delete the now-unused `toggle` destructure
   from `useRenderMode()` in this file if nothing else in the file uses it — check first.
3. In `Constellation.tsx`: change the label block (lines 32–37) from "Selected Works /
   [ SIGNAL MAP ]" to a single line "BODY OF WORK" (font-mono uppercase, same style as the
   current primary-colored line — drop the second dim line entirely, one clear label is
   enough). Update the section `id` if needed for the new nav anchor — nav still targets
   `#work`, so keep `id="work"` on the `<section>`.
4. Remove `<LegendWindow />` and its import (lines 7, 44–45). Delete
   `src/components/constellation/LegendWindow.tsx` entirely — no rainbow category legend on
   the page. Category colors in `graph.ts` (`CATEGORY_COLORS`) stay in the data model (Task 2
   will desaturate them for on-canvas use) but nothing renders a legend key anymore.
5. Update the paragraph under the label (line 39–41) — replace "Trace a star, or read it
   plainly." with copy that doesn't reference a mode choice, since there's no toggle now, e.g.
   "Every skill and every project, one living graph." (final copy at implementer's discretion,
   keep it one sentence, no first person, matches existing register).
6. Leave `useRenderMode` hook and its auto-detection (reduced-motion, low device memory, no
   WebGL → lite) fully intact — only the manual override UI is removed. Lite mode still exists
   as an automatic accessibility/perf fallback.

**Boundaries:** do not touch `ConstellationFull.tsx` internals (physics/motion — Task 2 owns
that file). Do not touch `ServicesTerminal.tsx` (Task 4). Do not add a `/services` or
`/contact` route — these are same-page anchors.

**DoD:** `npm run build` passes. Header shows Work/About/Services/Contact on desktop and
mobile. No MAP/PLAIN SIGNAL control anywhere in the DOM. Works section heading reads "BODY OF
WORK". No console errors. `grep -r "LegendWindow" src/` returns nothing.

---

## Task 2 — Signal Map v3: motion law, declutter, readout, accent-first stars
**Model:** opus · **Depends on:** 1 · **Parallel with:** 3

**Goal:** The map only moves in response to pointer (desktop) or scroll (mobile/tablet),
Redkie Ptitsy and Stereolove read as the lead stars with their skill chains lit by default,
and clicking a work opens an inline readout with real proof (image/video + one-line context +
case link) instead of only a tooltip.

**Files:**
- `src/components/constellation/ConstellationFull.tsx` (main rework)
- `src/components/constellation/ConstellationLite.tsx` (mirror the readout behavior in SVG/CSS)
- `src/components/constellation/ProjectDetail.tsx` (currently a modal — see contract)
- `src/data/graph.ts` (already has `accent`/`hero`/`weight` — no schema change needed)
- `src/lib/layout.ts` (read only, layout algorithm stays)

**Contract — motion law compliance (the core of this task):**
- Delete the idle pulse timer (`ConstellationFull.tsx` lines 197–201) entirely. Pulses fire
  only from `setActive()` (already wired at line 156–170) — i.e. only on hover/tap.
- Delete the random flatline glitch (lines 190–195) entirely — no idle glitch. (If a "flatline"
  visual is wanted later, it must trigger from a real event — e.g. first time a project node is
  opened — not a timer. Out of scope for this task; just remove it.)
- Replace the always-on sine/cosine "breathing" drift (lines 213–214, `driftX`/`driftY`
  applied via `Math.sin(t * 0.5 + n.phase)`) with motion driven by input:
  - **Desktop (`pointer: fine`):** node parallax offset is a function of pointer position
    relative to the section center (e.g. `offsetX = (pointerX - centerX) * depthFactor`),
    recomputed on `pointermove`, not on a running clock. When the pointer is outside the
    section or hasn't moved, nodes are static at their home position — zero motion.
  - **Touch/mobile:** node parallax offset is a function of scroll position within the section
    (e.g. scroll progress 0–1 mapped to a small drift range), recomputed on `scroll`, not on a
    timer. No motion while the user isn't scrolling.
  - The pointer-gravity pull (lines 217–228) already correctly requires `ptr.inside` — keep
    that, it's already event-gated. Only the unconditional drift needs converting.
  - The rAF loop itself can still run (needed for the pointer-gravity spring and pulse
    animations), but every visual state change inside it must trace back to a real input event,
    not elapsed time alone. If simplest: drive the whole frame from `requestAnimationFrame`
    only while a pointer/scroll event occurred in the last ~150ms, then let it settle to a
    final static frame and stop scheduling — i.e. the loop is not perpetual, it's
    event-triggered and self-terminating once settled (this also helps the 60fps/battery
    budget).
- ECG edge pulses (lines 258–274) stay — they already only spawn from `setActive`, which is
  hover/tap-driven. Fine as-is.

**Contract — declutter & color discipline:**
- Skill node color: currently full-saturation `CATEGORY_COLORS` from `graph.ts` (cyan/red/
  amber/violet/green) shown at all times for every skill label (line 342:
  `hexA(n.kind === 'project' ? '#f2efe9' : n.color, alpha)`). Change: skill labels default to
  a single dim warm-white/gray (e.g. `rgba(255,255,255,0.45)`), and only take on their category
  color when active/neighbor-highlighted (hover state). This kills the "rainbow dashboard" look
  while preserving the category color as a *response*, not ambient decoration.
- Un-labeled skills stay unlabeled until hover (already correct per current `show` logic for
  non-mobile — verify this still holds after the drift rework; mobile currently always shows
  non-active skill labels per line 330, `!isMobile ||...` — change so mobile also defaults to
  hidden-until-tap, consistent with desktop, to reduce clutter on small screens).
- Guarantee zero label overlap: before drawing a label, check its bounding box against
  already-drawn labels in this frame; if it collides, skip drawing that label this frame (skill
  labels are transient/hover-only now, so collisions should be rare — but accent skills and
  hero projects are always-on, so implement at minimum a collision check between the ~4 always-
  on labels — Redkie Ptitsy, Stereolove, and the 3 accent skills `touchdesigner`,
  `interactive-installations`, `experience-design`).
- Redkie Ptitsy and Stereolove (`hero: true` in `projects.ts`) render at their existing boosted
  weight/size (already implemented, lines 114, 282–288, 299) — additionally, on section
  mount/first pointer-enter, their direct skill edges (already in `PROJECTS[].skills`) render
  at elevated opacity by default (e.g. 0.35 instead of the ambient 0.07) even with no active
  node, so the two flagship chains read as "lit" at rest, without requiring hover. This is a
  static baseline opacity change, not a timer-driven animation — compliant with motion law.

**Contract — readout panel (replaces tooltip-only interaction):**
- `ProjectDetail.tsx` currently opens as a full modal (check its current implementation — read
  the file before starting). Change: **on desktop, clicking a project star opens an inline
  readout docked below the canvas** (within the same section, not a modal overlay) — image or
  video thumbnail, kind badge, title, one-line context (`project.tagline`), 1–2 sentence blurb
  (`project.blurb`), and a link ("Open case" if `project.url` exists externally, or "View
  below" scrolling to `PlainSignalIndex`'s matching row if it's an internal case in the future).
  Keep the existing modal as the mobile presentation if that's simpler (mobile screen space
  makes a modal reasonable) — but desktop must be inline-docked so the map and its proof are
  never more than one click apart in the same viewport, matching the PRD's "readout, not modal"
  intent.
- The existing `aria-live` caption (`Constellation.tsx` lines 59–64) can be superseded by this
  richer readout, but keep something screen-reader-announced when a project becomes active.

**Boundaries:** do not touch `Header.tsx`, `PlainSignalIndex.tsx`, or `Constellation.tsx`'s
outer shell (Task 1 owns those; only pull in the section id/props if needed). Do not add new
canvases or WebGL — this stays one 2D canvas. Do not exceed the existing `DPR` cap of 1.5.

**DoD:** with mouse plugged in and the tab focused, load the page, scroll to Body of Work, and
do not move the mouse for 5 seconds — nothing on the canvas should move (verify visually and by
confirming no rAF-driven position change in devtools performance panel). Moving the mouse
produces parallax; moving it away and letting it settle stops all motion. On a throttled mobile
emulation (Chrome devtools, mid-tier CPU 4x slowdown), scrolling the section is smooth and
~60fps; not scrolling produces zero animation. Clicking Redkie Ptitsy's star opens a readout
with its real image/video and a working link. No label text overlaps another label at any
viewport width 375–1920px.

---

## Task 3 — Blob-morph cursor with ECG lock
**Model:** opus · **Depends on:** 1 · **Parallel with:** 2

**Goal:** Replace the current dot+trailing-blob cursor with an organic blob that morphs to wrap
whatever interactive element is hovered, with a red ECG-style pulse tracing its outline on
lock. Desktop only (`pointer: fine`), fully event-driven.

**Files:**
- `src/components/CustomCursor.tsx` (full rewrite)
- `src/index.css` or wherever `.has-custom-cursor` / `cursor-none` utility classes are defined
  (grep for `has-custom-cursor` and `cursor-none` to find all consumers — every element that
  currently sets `cursor-none` expects this component to render a replacement, so the set of
  "interactive elements" the cursor reacts to should match that set, at minimum: header links,
  logo, nav, CTA buttons, constellation canvas nodes, plain-signal-index rows)

**Contract:**
- Idle state: a small circular blob (SVG, two overlapping circles with an SVG `feGaussianBlur`
  + `feColorMatrix` goo filter, ~8–10px effective radius), following the pointer with a spring
  (current lerp approach at 0.15 is fine to keep — that's pointer-driven, not idle, since it
  only moves on `pointermove` and settles to a fixed position otherwise).
- Hover state: on `pointerenter`/`mouseover` of a target element, read its `getBoundingClientRect()`
  and animate (CSS transition or spring, ~200–300ms) the blob's shape/transform to stretch and
  wrap the element's bounding box — same "tracked blob" feel as Submerged Realities' fluid
  projection mapping, i.e. an elastic outline that conforms to the rect rather than a rigid
  rectangle snapping into place. Implementation approach: an absolutely-positioned `<div>` with
  `border-radius` values animated per-corner (or an SVG path morphed via a small set of control
  points) sized/positioned to the target rect, blurred/composited to read as organic rather
  than a sharp box.
- Lock confirmation: at the moment the blob finishes wrapping (or immediately on hover — pick
  whichever reads better), trigger one non-repeating red pulse that traces the element's
  outline once (e.g. an SVG rect with `stroke-dasharray`/`stroke-dashoffset` animated 0→1 a
  single time via a CSS animation with `animation-iteration-count: 1`, restarted only by
  re-triggering the hover, never looping on its own).
- On `pointerleave`, the blob relaxes back to its idle circular shape and resumes following the
  pointer.
- No weapon/crosshair/reticle visual language — organic and rounded throughout, matching the
  "viewfinder/blob" direction, not targeting.
- `pointer: fine` media query gate stays (mobile/touch untouched, native cursor).
- No new persistent rAF loop beyond what's needed for the pointer-follow spring (which is
  already how the current component works and is acceptable since it's actively tracking real
  pointer input, not idling — but it should stop scheduling frames when the pointer hasn't
  moved for ~2s and the blob has settled, restarting on the next `pointermove`, to avoid a
  perpetual empty loop).

**Boundaries:** don't change what elements have `cursor-none` applied — only replace what
renders in response. Don't touch the constellation's own hit-testing/hover logic (Task 2 owns
that) — this cursor observes the same DOM/canvas hover state via existing events, it doesn't
duplicate hit-testing.

**DoD:** hovering any link, button, or constellation node produces the wrap+pulse; the pulse
fires once per hover-enter (not repeating while hovering); cursor is inert (no rAF, no
listeners active) on touch devices; no console errors; works over the canvas (constellation)
and over standard DOM elements identically.

---

## Task 4 — Services section rework
**Model:** sonnet · **Depends on:** — · **Parallel with:** 1, 8

**Goal:** Remove the typing animation and idle glitch from Services, add the clarity strip
under the hero, and render buyer-language copy instantly.

**Files:**
- `src/components/ServicesTerminal.tsx` (rework)
- `src/components/HeroSection.tsx` (add clarity strip — read file first to find insertion point
  right after the hero content, before the section ends)

**Contract:**
1. In `ServicesTerminal.tsx`: remove the character-by-character typing effect (the
   `setTimeout` chain building each line, roughly lines 47–110) and the `glitchInterval`
   (`setInterval`, ~line 154 per earlier grep) entirely. Text renders at full content
   immediately on mount/scroll-into-view — no reveal delay. Keep the terminal *frame* (border,
   prompt symbol, cursor blink if desired as a CSS-only non-animating-content decoration) as
   static chrome.
2. Rewrite the three service blocks in buyer language, organized by who hires:
   - **For music festivals & concerts** — audio-reactive stage visuals built per song or per
     set; real-time TouchDesigner systems that listen to the live mix; delivered as a turnkey
     show or operated live. Proof line: "Redkie Ptitsy — 19 unique projections, one per song."
   - **For theater & dance** — responsive scenography: projections that react to performers,
     sound, and story; from concept with the director to opening night.
   - **For venues, brands & institutions** — immersive installations and generative visual
     identities.
   Each block: one plain sentence on what you get + typical lead time + "brief to show"
   one-liner. Pull exact source project data from `src/data/projects.ts` (`redkie-ptitsy`
   entry) rather than re-typing facts by hand.
3. Add the clarity strip in `HeroSection.tsx`, directly under the existing hero text (which
   stays completely unchanged — do not edit the H1 or subline):
   ```
   LIVE VISUALS FOR CONCERTS & FESTIVALS · STAGE DESIGN FOR THEATER & DANCE · IMMERSIVE INSTALLATIONS
   Currently booking 2026–27 · Prague, works worldwide     [ See work ↓ ]  [ Contact → ]
   ```
   "See work" scrolls to `#work`; "Contact" scrolls to `#contact`. Static on load, no reveal
   animation gating its readability (may fade in on scroll-into-view once, CSS-only, but must
   be fully readable within the same viewport load as the hero — no delay before text is
   legible).

**Boundaries:** don't touch the hero H1/subline copy. Don't add typing/reveal delays anywhere
in this component. Don't invent a fourth service block.

**DoD:** loading the page and immediately taking a screenshot shows full services text, no
partial/typing state observable even at slow network throttling. `grep -n "setTimeout\|setInterval"
src/components/ServicesTerminal.tsx` returns nothing content-reveal-related. Clarity strip
visible under hero at both mobile and desktop widths, both CTAs scroll correctly.

---

## Task 5 — Readability, CLS elimination, heartbeat loaders
**Model:** sonnet · **Depends on:** 1, 4 · **Parallel with:** 6

**Goal:** Fix layout shift at its sources and turn the fix into a branded loading moment — a
dim ECG flatline in every reserved image/video/lazy-section box that fires one heartbeat pulse
the moment the real content actually loads (not on a timer).

**Files:**
- `src/components/AboutSection.tsx` (image around line 201)
- `src/pages/Index.tsx` (lazy `ParticleField`, `Suspense fallback={null}` at line 24)
- `src/components/constellation/Constellation.tsx` (canvas-holding wrapper — coordinate with
  Task 2's changes; this task should land after Task 2 or touch only the outer height-reserving
  wrapper, not the canvas internals)
- `src/components/ContactChannel.tsx` (typing via `useTyper` — same instant-render treatment as
  Task 4 applied here too, since this file also gates content behind typing per the original
  audit)
- Global stylesheet for font loading (`index.css` or wherever `@font-face`/Google Fonts link
  lives) — add `font-display: swap` and size-adjusted fallback fonts if not already present

**Contract:**
1. **New shared component** `src/components/HeartbeatPlaceholder.tsx`: renders a thin flatline
   (SVG or CSS, single horizontal line, dim red at ~15% opacity) filling a box of a given
   `width`/`height`/`aspectRatio` prop. Exposes a way for the parent to signal "loaded" (prop
   `loaded: boolean` or a callback) — on the transition from not-loaded to loaded, the flatline
   plays exactly one heartbeat spike (CSS animation, `animation-iteration-count: 1`, triggered
   by the prop change, not a timer) then fades to reveal the real content underneath/instead.
2. Use `HeartbeatPlaceholder` everywhere a shift-causing async load currently exists:
   - `AboutSection.tsx`'s image: wrap in a container with explicit `aspect-ratio` matching the
     image's real dimensions; show the placeholder until the `<img>`'s `onLoad` fires.
   - `ParticleField`'s `Suspense fallback={null}` in `Index.tsx`: give it a
     `fallback={<HeartbeatPlaceholder ... />}` sized to its final footprint instead of `null`,
     OR (simpler and equally valid) since `ParticleField` is a fixed full-viewport background
     with no in-flow height, verify it truly doesn't affect layout — if confirmed
     zero-CLS-impact, leave as `null` and document why in a one-line comment.
   - Any project thumbnail images in `ProjectDetail.tsx` / the readout panel from Task 2: same
     aspect-ratio-reserved + heartbeat treatment (coordinate — if Task 2 lands first, add this
     directly; if this task lands first, leave a clear placeholder for Task 2 to slot into).
3. Remove `ContactChannel.tsx`'s `useTyper`-driven reveal (`txHeader` and any other typed
   lines) — same instant-render rule as Task 4's services fix. This section's content must not
   be gated behind a typing animation per the original audit finding.
4. Add `font-display: swap` to font loading and verify the body/heading fonts have a
   metrically-matched fallback (`system-ui` stack) so text doesn't reflow when the webfont
   swaps in.
5. Full readability spec compliance (from the original design review, still binding): body
   text ≥16px, line-height 1.6, max-width ~70ch; uppercase+tracking only on single-line labels;
   contrast ≥ rgba(255,255,255,.87) primary / .60 secondary for informational text (the .25–.35
   opacity values are banned outside decorative use); mono font reserved for labels/data, never
   multi-sentence body copy.

**Boundaries:** don't redesign any section's layout beyond what's needed to reserve space and
fix contrast/type-role violations. Don't introduce a new loading state pattern outside
`HeartbeatPlaceholder` — one shared component, reused everywhere.

**DoD:** Lighthouse CLS < 0.02 on both mobile and desktop throttled profiles. Fast-scroll test
(scroll top-to-bottom in under 1s) produces no visible jump. Every async-loaded visual asset
shows a flatline-to-heartbeat transition, never a blank gap or pop-in. `grep -n "useTyper"
src/components/ContactChannel.tsx` shows it's no longer driving visible content reveal (may
still exist for a decorative label if truly instant, but no multi-second character reveal).
AA contrast check passes on all body/informational text.

---

## Task 6 — Case template + `/work/redkie-ptitsy`
**Model:** sonnet · **Depends on:** 4 · **Parallel with:** 7

**Goal:** A standalone, bookable case-study page for the flagship work, plus a reusable
template for future cases.

**Files (new):**
- `src/pages/WorkCase.tsx` (or `src/pages/work/[slug].tsx` equivalent — check
  `src/App.tsx`'s router setup, likely React Router given `react-router-dom` conventions; read
  `src/App.tsx` first to match the existing routing pattern)
- Route registration in `src/App.tsx`

**Contract:**
- Route: `/work/redkie-ptitsy`. Content sourced from `PROJECTS.find(p => p.id ===
  'redkie-ptitsy')` in `src/data/projects.ts` — do not duplicate its data inline.
- Sections: context (venue, date, band), the challenge/brief in one paragraph, the 19
  projections as a simple structured list or grid (title/description per song not required if
  that data doesn't exist yet — at minimum show the count and format clearly), tech stack
  (`project.tools`), embedded video (`project.video`, lazy-loaded, `rel="noopener"` on any
  outbound links), a **process strip**: a compact horizontal strip of 3–4 images/fragments
  showing method (TouchDesigner node graph screenshot, signal-chain diagram, rehearsal photo —
  use existing project assets if available, otherwise a simple labeled diagram is acceptable
  placeholder content Sinaida can swap later), and a closing CTA: "What a festival can order" —
  one paragraph translating this case into a bookable service, linking to `#services` on the
  homepage or the future `/booking` page from Task 7.
- Own `<title>`, meta description, and OG tags (static, so it works with the existing
  `scripts/inject-seo.mjs` static-SEO approach — check that script before assuming anything,
  since the repo already solves SEO via a build-time injection step).
- Template: extract the page into a shape that a future `/work/<slug>` only needs a new
  `Project` entry + this same component to render — don't hand-roll a one-off page that can't
  be reused.
- Must render correctly with `useRenderMode()` returning `lite` (no dependency on WebGL/canvas
  for this page — it's plain content, images, and video, so lite-mode compliance should be
  automatic if no canvas is used here).

**Boundaries:** don't build `/work/<slug>` for other projects yet — just the template + the one
real page. Don't touch the homepage `Constellation`/`PlainSignalIndex` beyond whatever link
target they need to point at this new URL (verify `constellationBus.focusWork` / existing
project links already point here or update them to `/work/redkie-ptitsy` where
`project.id === 'redkie-ptitsy'`).

**DoD:** `/work/redkie-ptitsy` loads directly (not just via client-side nav) with correct
meta/OG tags present in the served HTML (check post-build, since `inject-seo.mjs` runs at
build time — verify with `npm run build` then inspect `dist/`). Page loads in under 2s locally.
Works with JS-disabled-equivalent (static content check) for the text/meta portions per the
site's existing SEO approach. No broken links.

---

## Task 7 — `/booking` + `/press`
**Model:** sonnet · **Depends on:** 4 · **Parallel with:** 6

**Goal:** One page bookers land on for full commercial detail, and one fast-lane URL Sinaida
can send directly to press/programmers.

**Files (new):**
- `src/pages/Booking.tsx`, route `/booking`
- `src/pages/Press.tsx`, route `/press`
- Route registration in `src/App.tsx`

**Contract — `/booking`:**
- Full version of the three service blocks from Task 4 (reuse the same copy/data, don't
  duplicate by hand — extract to a shared constant both `ServicesTerminal.tsx` and this page
  import from, e.g. `src/data/services.ts`).
- Process timeline: brief → concept → build → rehearsal → show (simple horizontal or vertical
  steps, static, no scroll-jacking).
- Practicalities: travel, basic tech-rider expectations, typical lead times — plain sentences,
  placeholder-reasonable content Sinaida can edit later (don't invent specific numbers that
  read as commitments; use ranges like "typical lead time: 4–8 weeks depending on scope").
- Contact: reuse the `ObfuscatedMailto` component from Task 8 (this task depends on Task 8's
  output existing — if Task 8 hasn't landed yet when this starts, use the current mailto
  pattern temporarily and leave a one-line TODO comment to swap it, don't block on it).
- Static-friendly: same SEO/meta treatment as Task 6.

**Contract — `/press`:**
- Single scrollable page: short bio (reuse existing About copy — don't rewrite from scratch,
  pull from `AboutSection.tsx`'s content or a shared source), 2–3 representative images/stills
  from `PROJECTS`, tech basics (TouchDesigner/GLSL/real-time — a short list), contact via
  `ObfuscatedMailto`. This is the "one link to send" page — keep it fast-loading and complete
  without requiring the visitor to click anywhere else.

**Boundaries:** don't build a downloadable PDF press kit in this task — that was explicitly
parked to backlog. `/press` is a page, not a document generator.

**DoD:** both routes load directly with correct meta. `/booking` and `/press` linked from
somewhere reachable (footer and/or services section). No duplicated copy — verify via grep that
service block text exists in exactly one data source.

---

## Task 8 — Email obfuscation unification
**Model:** haiku · **Depends on:** — · **Parallel with:** 1, 4

**Goal:** Stop leaking the plain address in served HTML while keeping the exact same address
Sinaida already uses — no new address, ever.

**Files:**
- `src/components/ContactChannel.tsx` (lines ~336, ~425 — plain `mailto:gallant_mod5v@icloud.com`)
- `src/components/ContactSection.tsx` (line ~50 — already uses a `.join('')` array-split
  obfuscation pattern on click; this is the good example to generalize)
- New: `src/components/ObfuscatedMailto.tsx`

**Contract:**
- Create `ObfuscatedMailto`, a component that renders a link/button which only assembles the
  `mailto:` address at click/tap time (mirroring `ContactSection.tsx`'s existing
  `['gallant', '_mod5v', '@', 'icloud', '.com'].join('')` approach), and never places the plain
  address in the initial HTML, the accessibility tree's accessible name (use a generic label
  like "Email" or "Contact" as the visible/aria text, not the address itself), or any `href`
  attribute at rest (set `href="#"` or omit it, and navigate via `onClick` +
  `window.location.href` as `ContactSection.tsx` already does).
- Replace both hardcoded `mailto:gallant_mod5v@icloud.com` instances in `ContactChannel.tsx`
  with `<ObfuscatedMailto>`.
- Replace `ContactSection.tsx`'s inline version with the same shared component (same behavior,
  now reusable — check if `ContactSection.tsx` is even still used on the page, since
  `ContactChannel.tsx` may have superseded it; if unused, leave it as-is or note it as dead code
  for a separate cleanup, don't delete unrelated files in this task).
- **Do not change the address itself.** It stays `gallant_mod5v@icloud.com` split however the
  component needs internally.

**Boundaries:** don't add a contact form, don't add a third-party form service, don't touch
anything unrelated to email rendering.

**DoD:** `curl` (or `view-source:`) the built page and confirm `gallant_mod5v@icloud.com` does
not appear anywhere in the raw HTML (`grep -r "icloud" dist/` after `npm run build` returns
nothing, or only appears inside a JS bundle in a form no simple text scraper reconstructs
without executing the join). Clicking the email link/button still opens a working mailto in a
real browser.

---

## Task 9 — Pointer-displacement work thumbnails
**Model:** opus · **Depends on:** 6 · **Parallel with:** 7

**Goal:** Work thumbnails (readout panel images from Task 2, case page hero images from Task 6)
ripple/displace under the pointer on desktop, still when the pointer isn't moving.

**Files:**
- New: `src/components/DisplacementImage.tsx`
- Consumed by: the readout panel image (Task 2's `ProjectDetail.tsx` or its replacement) and
  `WorkCase.tsx`'s hero image (Task 6)

**Contract:**
- WebGL (or CSS `backdrop-filter`/SVG `feDisplacementMap`, whichever is cheaper — prefer SVG
  filter if it achieves a comparable look, since it avoids spinning up a second WebGL context
  alongside the constellation's canvas) displacement effect: the image distorts locally around
  the pointer position, strongest near the cursor and fading outward, and returns to
  undistorted the instant the pointer stops moving or leaves (no residual animation, no decay
  timer beyond a short CSS-eased return — the return transition itself is fine since it's still
  a direct consequence of the leave event, not an independent timer).
- `pointer: fine` only; static image on touch devices (no fallback animation attempt — just the
  plain image).
- Must pause/detach its listeners when the image is off-screen (IntersectionObserver, matching
  the pattern already used in `ConstellationFull.tsx`).

**Boundaries:** this is a visual-polish component, not a new content type — it wraps an
existing `<img>`, it doesn't fetch or manage its own image sources.

**DoD:** hovering a work thumbnail on desktop shows the ripple; moving away returns it to flat
within ~300ms; touch devices show a plain static image with zero JS overhead for the effect
(verify the displacement code doesn't even initialize on `pointer: coarse`).

---

## Task 10 — QA pass
**Model:** sonnet · **Depends on:** 2, 3, 5, 6, 7, 9 · **Parallel with:** —

**Goal:** Verify the whole v3 build against the PRD's success criteria before merge to `main`.

**Checks:**
1. Single global rAF budget: audit every component for `requestAnimationFrame` usage, confirm
   none run perpetually without a recent input event (per Task 2 and Task 3's event-gating).
2. Lighthouse mobile ≥ 90 (performance), CLS < 0.02, on the homepage and on
   `/work/redkie-ptitsy`.
3. `prefers-reduced-motion` and manual low-end emulation (4x CPU throttle, low memory) both
   correctly fall back to lite/static rendering with zero WebGL/canvas.
4. AA contrast audit across all informational text (automated tool + spot check).
5. `grep -r "icloud" dist/` after build returns nothing in plain form (Task 8 verification,
   re-run here as final gate).
6. SEO: `sitemap.xml`, `llms.txt`, `robots.txt`, and JSON-LD updated to include
   `/work/redkie-ptitsy`, `/booking`, `/press`. Verify `scripts/inject-seo.mjs` covers the new
   routes (read the script; it may need new entries for these paths — treat this as part of
   this task if the script is a static list).
7. Full click-through: every nav link, CTA, and work star leads somewhere real, no dead links,
   `rel="noopener"` present on all external links.
8. Cross-check the site never breaks: this task runs against a preview build, not `main`
   directly — merge to `main` only happens after this task passes.

**DoD:** a written pass/fail table against every criterion above, committed as a short report;
any failures get fed back into the relevant task's implementer before merge.

---

## Sequencing
```
Wave 1 (parallel):  Task 1, Task 4, Task 8
Wave 2 (parallel):  Task 2, Task 3, Task 5   [2,5 depend on 1; 3 depends on 1]
Wave 3 (parallel):  Task 6, Task 7            [both depend on 4]
Wave 4:             Task 9                    [depends on 6]
Wave 5:             Task 10                   [depends on 2,3,5,6,7,9] → merge sandbox-zone → main
```

## GitHub issues (pending)
`gh` CLI is installed but not authenticated in this environment. Once Sinaida runs
`gh auth login` interactively, these 10 tasks should be filed as issues (title = task name,
body = the corresponding section above verbatim), status "In Progress" set on dispatch, closed
only after Task 10-equivalent verification per task. Until then, this document is the spec of
record and each implementer commit should reference "(Task N)" in its message.
