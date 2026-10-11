# PRD: sinaida.eu, from mess to Site of the Month

Single source of truth for the remaining work, written 2026-10-11 after the cloud sessions up to PR #184. Every open task lives in one of four GitHub milestones under the epic #212; this file says why and in what order. Older audits (`docs/awwwards-audit.md`, the spacewalk and #179 handoffs) are history.

## Vision

A touring music act or a dance company lands on the site, sees one world, understands within 60 seconds that Sinaida makes visuals that live with performers, and books a call. Underneath, a build clean enough to compete for Awwwards Site of the Month and the Developer Award.

## Buyer

1. International stage: touring music acts, dance companies, festivals.
2. Spaces and installations: museums, galleries, immersive rooms.
3. Open calls and residencies.

Every task is ranked by how much it moves buyer 1.

## The world (pending, task #194)

“We are made of stardust” with soft glowing particles is a generated-art trope, so the lore gets rebuilt from her own path: Bauman engineering, biomedical engineering, stage visuals, the overview effect, light in the darkness, dither and pixel glitch. Bloom stays. The Gattaca line is the inspiration and is never quoted on the site.

She leans to **Light seen from orbit**: darkness is the ground, dither is matter (engineered, pixel, the machine), bloom is life (every glow is caused by a person), and the overview is the moment both are seen at once. The decision opens M2 and blocks every visual task until she approves the world bible.

## Who decides

- **Her call** (label `her-call`): every wording change and every visual or conceptual change. Mocks or text drafts go to her before merge.
- **Mine, reported:** alignment, bugs, accessibility, performance, security, tests.

## Constraints that hold

- Motion law: nothing moves without scroll, hover or click; motion rewinds; hover effects are desktop only.
- One red. Links stay real DOM. Text never sits on dense lights.
- 60 fps on a 5-year-old laptop; lite mode and reduced motion always work.
- Design system: `~/dev/design-system-docs/DESIGN-SYSTEM.md`.

## Milestones

### M1 Fix: quick fixes, bugs, debt

| Issue | Task |
|---|---|
| #185 | Remove lovable-tagger |
| #186 | Licensing date from the last commit |
| #187 | Tesseract image clickable, Back restores scroll |
| #188 | Hero text grows when the window narrows |
| #189 | Headers on one left axis on phones, lite LET'S TALK |
| #190 | Lite Body of Work: no scrollbar, square cards |
| #191 | tsc to zero, tests, one #179 handoff |
| #192 | Recheck cursor and stars notes |
| #193 | Header underlay tone (her call) |
| #147 | Esc on SynthPanel and Snake, AVIF portrait |
| #152 | Graph hover card cut, lite preview |
| #160 | Project names in caps |
| #106 | Screen-reader leftovers (ScrambleText, glyphs) |
| #141 | Phone first seconds cue (recheck) |

### M2 Sell: international stage first

| Issue | Task |
|---|---|
| #194 | The site's world (blocks visual work) |
| #195 | Positioning for stage buyers |
| #196 | Offerings rework and captions |
| #197 | Testimonial: Kamil Yegelev |
| #198 | All other pages in the home's language, slop audit |
| #138 | Services and Contact: scale, contrast, commission path |
| #139 | Showreel slot (blocked on the reel itself) |
| #143 | Case outcome blocks, real facts only |
| #144 | Redkie Ptitsy testimonials |

### M3 Wow

| Issue | Task |
|---|---|
| #199 | Sphere bursts out of About's stars |
| #200 | Tesseract from particles, moves in x/y/z |
| #201 | About: portrait and text trajectories |
| #202 | Title parallax, scroll-direction law |
| #203 | Footer in the world, falling stars, #179 verdicts |
| #204 | Spotify easter egg |
| #205 | Textures and effects overview |
| #142 | Light bloom on some sphere dots |

### M4 Audit and submit

| Issue | Task |
|---|---|
| #206 | Performance pass, Lighthouse budget in CI |
| #207 | 60 fps on real old hardware |
| #208 | Security: CSP, headers, dependencies |
| #209 | Accessibility final pass |
| #210 | Colophon |
| #211 | Final slop pass, then submission |
| #146 | Static first frame on case pages |
| #145 | CSP: inline styles to classes |

## Out of scope

- ECG hero and branded preloader: they compete with the world.
- Idle or “notices you” animation: breaks the motion law.
- Renaming the Full/Lite toggle.
- The Blissful media slider as a separate component: a second navigation.
- Quoting the Gattaca line on the site.
- New features from outside the world.

## Success criteria

- A stage buyer names what she does and reaches “book a call” within 60 seconds.
- Every page speaks one visual language.
- Zero slop markers in the copy and in the visuals; every visual lives in one world.
- Lighthouse at least 95 on performance and accessibility in both modes.
- 60 fps on a 5-year-old laptop.
- Every open issue sits in a milestone.

## How the work runs

- Solo Opus, no subagents. One session per milestone, on a `YYMMDD_m<N>-<name>` branch with one PR; never commit to main.
- Each session starts by reading this file and the milestone's issues; the spec goes into each issue body before work starts.
- One preview check per group of changes; her-call items go to her as mocks or text before merge.
- A milestone closes when its PR is merged and its verdict list is answered.
- Rough cost: M1 about 250k tokens, M2 about 350k, M3 about 500k, M4 about 250k.

<!-- Je suis le spectre d'une rose que tu portais hier au bal. -->
