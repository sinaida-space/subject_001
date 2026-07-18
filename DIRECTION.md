# DIRECTION — aesthetic-v2

Terminal → Signal. Working document for the sinaida.eu restyle. Draft — finalized at pick point.

## Thesis

The terminal aesthetic says *"I write code."* In 2026 that reads as default — the look every AI-generated portfolio ships with. It has become what hyperrealism was to image generation: a commodity register that hides the author.

The replacement says *"I build things you stand inside."* Every surface of the site becomes a **signal passing through physical media** — an LED wall, a tape deck, a scope. These are machines that exist in venues, studios, and labs: the three rooms Sinaida has actually worked in. The aesthetic is autobiographical, which is exactly why it can't be slop — slop has no biography.

## What is constant (any variant)

- Stage: `hsl(280 33% 3%)` — the violet-black. Never pure #000.
- Signal: `#CC1414`, bright pass `#ff3333`. Monochrome red identity; no foreign hues (no scope green, no matrix green, ever).
- **Neon bloom is the signature** — light behaves like light, bleeding off its source. Threshold high (0.5–0.6) so only true highlights bloom; glow color `#ff3333`; never white-out.
- ECG logo + snake easter egg: untouched. They were already the right idea — the restyle extends their language outward.
- Constellation + music: preserved, re-skinned only (`ConstellationFull.tsx` + `graph.ts` carry hardcoded hex — reskin means those files, not just CSS).
- Full/light tiers ride the existing `useRenderMode()` (`'full' | 'lite'`, `data-mode` attr). **Every new effect declares its lite fallback at design time**, not as an afterthought.
- Banned: marquee/scrolling text, terminal glyphs (`$`, `>`, block cursors, boot sequences, `[ NAV.SYS // OPEN ]`), emoji, glitch-for-glitch's-sake. Every effect must name its physical referent: LED pixel pitch, tape tracking error, phosphor decay. If it has no referent, it's decoration — cut it.

## The three languages (pick point)

| | A — STAGE | B — TAPE | C — LAB |
|---|---|---|---|
| Room | Standing too close to an LED wall | The control room of monitors | The signal lab she trained in |
| Display type | Doto (dot-matrix, per-dot bloom) | Space Grotesk + chroma-split | Space Grotesk + instrument brackets |
| Texture | LED mosaic, pixel pitch | Bayer dither, tracking, scanlines | Reticle grid, phosphor persistence |
| Micro-copy | HUD: BPM, dB, coordinates | Timecode, CAM 01—STAGE / FOH / BACKSTAGE | 72 BPM · 3.4 mV · SIG LOCKED |
| Sells loudest to | Bookers, festivals | Music artists, video-adjacent clients | Concept-driven commissions; the biomedical origin story |

Hybridization after the pick is legitimate (e.g. A's type + C's readouts) — the pick chooses the *lead voice*, not a prison.

## Type system (post-pick)

- **Display**: variant-dependent (above).
- **Data face**: Tiny5 — replaces monospace-as-decoration everywhere (labels, captions, credits, readouts).
- **Body**: Space Grotesk 300/400. Body text is never pixel, never mono — legibility floor.
- **Retired from decorative duty**: Space Mono, IBM Plex Mono. Mono survives only where content is literally code.
- CSS bloom for type (lite tier + small elements): 3 layered text-shadows — `0 0 2px`, `0 0 8px`, `0 0 24px` at descending opacity, `#ff3333`.

## Selling the work (positioning ideas, by audience)

**Bookers / festivals** — buy risk-reduction plus spectacle.
- Speak venue: the site already uses FOH/backstage vocabulary in its chrome — it signals "she has stood at front-of-house," before a word of bio.
- Reframe case studies as **shows**: venue, date, format, audience size — like tour history, not "projects." Her MC/hosting history (500-seat theaters) belongs in About as production credibility, not buried.
- Services as a **tech rider**: inputs, deliverables, setup needs, lead time. A booker recognizes a rider instantly; it reads as "worked with production teams before."

**Music artists / bands** — buy a feeling: *my set will look insane*.
- The site itself must behave like a show — the audio-reactive constellation is the live demo. Put "this page is audio-reactive — turn sound on" where a band will find it.
- Named offer: **visuals for one set**, small scope, clear price shape. The Moscow club set is the case study.

**Commercial clients** — buy reliability wearing a distinctive coat.
- The About page carries the systems past (GE, project management, quantified outcomes) in her flat declarative register. The aesthetic proves taste; the bio proves shipping.
- One line she owns and no competitor can copy: engineer of medical signal systems → artist of stage signal systems. Same discipline, different room.

**Copy bank (hero alternatives, for pick point — current site: "Where Engineering Meets Imagination")**
- `VISUAL WORLDS FOR PHYSICAL SPACES` (mockup default — hers already)
- `SIGNAL, MADE VISIBLE`
- `LIGHT FOR ROOMS, NOT FEEDS`
- `ENGINEERED TO BE FELT`

## Rollout map (post-proof, ordered)

1. Tokens + fonts land globally (new faces in, mono demoted) — smallest diff, widest effect.
2. Header / Logo chrome: mobile menu loses `[ NAV.SYS // OPEN ]` → variant-language equivalent.
3. Hero (the proof piece — already done by this point).
4. `ServicesTerminal` → replaced by the chosen room's furniture: LED board / monitor wall / instrument panel. Same content, new machine.
5. Constellation reskin (`ConstellationFull.tsx`, `graph.ts` hex values) + snake overlay colors checked against new tokens.
6. Section breaks, footer, Collaborate + WorkCase pages.
7. Delete `public/mockups/` before merge to main. Merge = deploy (Pages auto-deploys main).
