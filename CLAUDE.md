# Project rules — sinaida.eu

## Typography — STRICT

**No IBM Plex (any variant) or similar terminal/coder monospace fonts** (Space Mono, JetBrains Mono, Fira Code, Courier, etc.) anywhere on this site. These read as generic AI-generated developer-portfolio boilerplate, not this practice.

Current type system:
- Body copy, labels, UI chrome → **Geist**, weight 300 (`font-mono` / `font-clinical` utility classes — both map to Geist Light despite the legacy names).
- Headings (h3/h4, card titles, secondary chrome) → **Space Grotesk** (`font-display`).
- True `<h1>`/`<h2>` headline moments only → **Doto**, styled as an LED/dot-matrix retro hardware display (`font-led`). Do not apply this to dense body text, legal copy, or small repeated section labels — it's illegible below display size.

Before adding any new font or reintroducing a monospace typeface, check this rule first.

## Visual language — avoid AI-slop terminal cosplay

Do not add: blinking terminal cursors, `$ ` prompt-style lines, `[ VALUE // STATUS ]` bracket badges, fake OS/boot banners, or decorative snake_case labels presented as UI copy. These are decorative clichés from generic AI-generated dark portfolios, not functional references to tools actually used in the practice.
