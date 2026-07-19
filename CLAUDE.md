# Project rules — sinaida.eu

## Typography — STRICT

**No IBM Plex (any variant) or similar terminal/coder monospace fonts** (Space Mono, JetBrains Mono, Fira Code, Courier, etc.) anywhere on this site. These read as generic AI-generated developer-portfolio boilerplate, not this practice.

Current type system — single family, Jersey 20 (Google Fonts):
- Body copy, labels, UI chrome → **Jersey 20** (`font-mono` / `font-clinical` utility classes).
- Headings and display moments (h1/h2 headline moments, h3/h4, card titles, secondary chrome) → **Jersey 20** (`font-display`).
- `font-led` is a legacy alias kept only so existing class names don't need renaming — it also maps to Jersey 20. Geist, Doto, and Space Grotesk have all been removed from the site; do not reintroduce them.
- The dev-only "FontLab" A/B heading-font switcher has been removed (was `src/components/FontLab.tsx`, `?fontlab=1`); do not reintroduce a font-switching mechanism without asking first.

Before adding any new font or reintroducing a monospace typeface, check this rule first.

## Visual language — avoid AI-slop terminal cosplay

Do not add: blinking terminal cursors, `$ ` prompt-style lines, `[ VALUE // STATUS ]` bracket badges, fake OS/boot banners, or decorative snake_case labels presented as UI copy. These are decorative clichés from generic AI-generated dark portfolios, not functional references to tools actually used in the practice.
