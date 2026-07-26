# sinaida.eu — v2 Master Plan (orchestration spec)

**Goal:** the site is a *digital version of Sinaida* — the impression of a high-profile digital artist, credible enough to be booked by **music festivals, theater and dance productions**. Every decision below serves that: compact, confident, no filler, one signature interactive centerpiece instead of many scattered effects.

**Positioning statement (drives all copy):** *Digital artist creating live audio-reactive visuals and immersive experiences for stage — concerts, theater, dance.*

---

## 1. Site architecture — compact homepage + two booking pages

Hero copy stays as-is ("Where Engineering Meets Imagination" — Sinaida's decision). No showreel exists; the Redkie Ptitsy YouTube short is the primary video proof.

```
HOMEPAGE /
┌──────────────────────────────────────────────┐
│ 1 IDENTITY    hero: current text, unchanged  │
│   + CLARITY STRIP (new): live visuals for    │
│   concerts & festivals · stage design for    │
│   theater & dance · booking 2026–27 · CTAs   │
├──────────────────────────────────────────────┤
│ 2 CONSTELLATION  ★ the centerpiece ★         │
│   skills + projects in ONE interactive graph │
│   (doubles as navigation)                    │
├──────────────────────────────────────────────┤
│ 3 SELECTED WORKS  compact expandable rows;   │
│   row 1 = Redkie Ptitsy with video embed →   │
│   links to full case page                    │
├──────────────────────────────────────────────┤
│ 4 EXPERIMENTS & TOOLS  plain link list       │
│   (games, guides, Seedance — one line each)  │
├──────────────────────────────────────────────┤
│ 5 WORK WITH ME  3 buyer-oriented service     │
│   blocks (terminal skin, no typing delay),   │
│   contact, press kit → /booking              │
└──────────────────────────────────────────────┘

/work/redkie-ptitsy   flagship case study — the link Sinaida
                      sends to bookers (context, 19 projections,
                      tech, video, "what you can order")
/booking              services in full, process timeline,
                      practicalities, press kit, contact
/work/<slug>          case template for future gigs (later)
```

Conversion rule (binding): a booker answers *who / what / proof / how to hire* within 5 seconds — no information is gated behind animation. Full spec in DESIGN_REVIEW.md.

Cuts vs current site: GalleryTunnel (replaced by compact works rows), separate SkillsSection (merged into Constellation), heavy per-project cards for experiments (become links). Fewer components, one strong idea.

---

## 2. The Constellation — skills and projects as one graph

This answers "connection in skill tree and the projects" and is the single wow-element the visitor remembers.

**Data model** — one graph, one source of truth (`src/data/graph.ts`):

```ts
type SkillNode   = { id; label; category; }        // small dim stars
type ProjectNode = { id; title; year; type; url? } // bright named stars
type Edge        = { skill: string; project: string }
```

- **Projects are bright nodes** (Redkie Ptitsy, Submerged Realities, Synesthetic Bloom, Legacy, + the 4 games as small satellite nodes, + tools).
- **Skills are the connective tissue**: TouchDesigner links to Redkie Ptitsy + Submerged + Synesthetic; "audio-reactive systems" links its cluster; "AI pipelines" links another.
- **Interaction:** hover/tap a skill → its projects glow and edges pulse (red ECG signal). Tap a project node → scrolls to its row in Selected Works, or opens the external link for games/tools. Drag nodes → elastic force-directed response.
- The graph *is* the sitemap: a booker sees at a glance that the same hands that build TouchDesigner concert visuals also ship AI tools and interactive web pieces — that's the "digital version of me".
- Mobile: same graph, fewer skill nodes (top ~12), tap-driven, physics stepped down.

---

## 3. Selected Works — compact, stage-first

No big cards. A vertical list of 3–4 rows, each: `year — title — one-line context — [expand]`. Expanding reveals inline: 2–3 sentences, video embed, tools, link. Order optimized for festival/theater bookers:

1. **Redkie Ptitsy — Live Concert Visuals** (2026, Sklad №3, Moscow) — 19 unique audio-reactive projections, one per song, TouchDesigner. *The flagship: this is literally the service festivals buy.*
2. **Submerged Realities** — projection mapping study.
3. **Synesthetic Bloom** — audio-responsive organism (proof of real-time sound-to-visual craft).
4. **Legacy in the Age of Stochastic Output** — conceptual depth (theater/dance relevance: narrative, soul).

---

## 4. Experiments & Tools — links only

One compact block, plain typographic list, no cards, no images:

```
INTERACTIVE EXPERIMENTS
→ Stereolove        hand-tracking question game · camera
→ Void              one-shot ritual · sound on
→ The Well          questions by theme · cursor-reactive
→ Crystal           scroll-driven crystal forge

TOOLS & GUIDES
→ Seedance Director prompter GPT
→ Dreamscape Navigator   creative guides (RU)
```

Each line: title, 5-word descriptor, external link, tiny badge (camera / sound / RU). Hover = the line's node lights up in the Constellation above (cheap, high-delight cross-link).

---

## 5. Lite / Full dual-mode

**Strategy: lite-first progressive enhancement.** Lite is not a fallback page — it's the same page without the expensive layers.

| Layer | Lite | Full |
|---|---|---|
| Constellation | static pre-rendered SVG of the same graph; hover/tap highlight via CSS only | canvas, force physics, drag, cursor gravity, ECG pulses |
| Background | fixed star texture (CSS) | ParticleField with interaction |
| Motion | fade-ins only | full framer-motion choreography |
| Cursor | native | custom cursor |

**System decides (on first paint, <5ms, no benchmark):**

```
lite if: prefers-reduced-motion
      or navigator.connection.saveData / effectiveType ∈ {2g, slow-2g}
      or deviceMemory ≤ 4  or hardwareConcurrency ≤ 4
      or no WebGL context
else: render lite shell instantly → hydrate full layers after idle
```

Manual toggle in footer ("lite / full"), persisted in localStorage, overrides detection. Lite ships in the initial bundle → fast LCP, good Lighthouse, SEO-safe; full layers are lazy chunks. One codebase, mode = React context flag.

---

## 6. Work packages (for delegation to executor models)

Each WP is self-contained: spec in, PR out. Dependencies noted. Suggested executor tier: **S** = strong model (novel/creative code), **M** = mid (well-specified implementation), **L** = light (mechanical).

| WP | Deliverable | Tier | Depends | Acceptance criteria |
|----|-------------|------|---------|---------------------|
| **0** | Merge `origin/WIP` → `main`, deploy, delete WIP | L | — | site live & unchanged visually; CI green |
| **1** | `src/data/graph.ts` + `projects.ts`: all nodes/edges/copy for 10 works & ~20 skills; remove hardcoded PROJECTS duplication from Index.tsx | M | 0 | single import site-wide; typecheck passes |
| **2** | Mode system: detection hook `useRenderMode()`, React context, footer toggle, localStorage persistence | M | 0 | correct mode on throttled/low-mem emulation; toggle overrides |
| **3** | Constellation FULL: canvas force-graph, drag, hover-glow, ECG edge pulses, project-node click → scroll/external | **S** | 1, 2 | 60fps desktop / 30fps mid-mobile; touch works; pauses off-screen |
| **4** | Constellation LITE: static SVG export of same graph data, CSS hover highlights | M | 1, 2 | zero canvas/rAF; interactive highlight still works; <15KB |
| **5** | Selected Works rows: compact expandable list, Redkie Ptitsy first with lazy video embed, link to case page | M | 1 | replaces GalleryTunnel; CLS ≈ 0 on expand |
| **6** | Experiments & Tools link list + hover→constellation cross-highlight | L | 1, 3 | all external links correct, `rel="noopener"`, badges render |
| **7** | Readability pass site-wide per DESIGN_REVIEW spec: type roles (Grotesk body / Mono labels only), ≥16px body, contrast fixes, remove typing-gated content, keep hero text untouched | M | 0 | AA contrast on all informational text; no content behind animation |
| **8** | Clarity strip under hero + services rewrite in buyer language (3 blocks: festivals/concerts, theater/dance, venues/institutions); terminal skin kept, typing delay removed | **S** (or ux-copy skill) | 7 | hero text unchanged; 5-second test passes with cold reader |
| **9** | `/work/redkie-ptitsy` case page + `/work/<slug>` template: context, 19 projections, tech chain, video, "what you can order" CTA | **S** | 1, 7 | standalone URL, own OG image/meta, loads < 2s, works in lite mode |
| **10** | `/booking` page: full services, process timeline, practicalities (travel, rider basics, lead times), press kit link, contact | M | 8 | reachable from header + zone 5; static-friendly (SEO) |
| **11** | Press kit: one-page PDF (bio, selected works, tech basics, contact) | M | 8 | downloadable, matches site aesthetic |
| **12** | Domain email: set up hello@sinaida.eu forwarding, replace `gallant_mod5v@icloud.com` everywhere | L (+ Sinaida: DNS) | — | no icloud address anywhere on site or press kit |
| **13** | QA & perf: single rAF audit, Lighthouse mobile ≥ 90 (lite), reduced-motion + AA contrast audit, sitemap/llms.txt/OG/JSON-LD refresh incl. new pages | M | 3–10 | test matrix passes (iOS Safari, Android Chrome, desktop) |

**Sequencing:** WP0 → WP1+WP2+WP7+WP12 (parallel) → WP3+WP4+WP5+WP8 (parallel) → WP6+WP9+WP10 (parallel) → WP11 → WP13. Each WP = feature branch + deploy preview; site stays live throughout.

**Priority order if time-boxed:** conversion first (WP7, 8, 9, 10, 12 — these get bookings), wow second (WP3, 4 — this gets remembered). Both matter; only one pays.


---
