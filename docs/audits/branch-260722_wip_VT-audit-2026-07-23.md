# sinaida.eu — branch `260722_wip_VT` — aliens-built-my-website Audit

**Scope:** uncommitted working-tree changes on `260722_wip_VT` (diff vs. `main`,
15 tracked files + 4 untracked). Not a full-site re-audit — GDPR (privacy
policy, cookie banner), security headers, and SEO basics were already
confirmed present in earlier work and are unchanged by this diff, so they're
out of scope here per the checklist's "genuinely N/A" allowance.

**Verdict: no Critical/High findings. Ship-safe.** This branch is a coherent
cleanup pass — improves contrast, removes decorative clutter, fixes a
long-standing horizontal-scroll bug — with one new interaction (hero tag
"launch" scroll) built correctly against the motion/accessibility rules from
the start.

## What's already working

- **Contrast fixed upward, not down.** Every opacity change in this diff goes
  `/0.40 → /0.60` or `/0.45 → /0.65` (Footer, Header nav copy, AboutSection,
  ServicesTerminal, ContactChannel, WorkCase labels) — closer to WCAG AA body-text
  contrast, never the reverse.
- **Decorative fake-terminal chrome removed**, not just restyled: the
  `WaveformCanvas`/`FreqDisplay` in [ContactChannel.tsx](src/components/ContactChannel.tsx),
  the fake `SINAIDA_OS v2.4.1` boot log in [ServicesTerminal.tsx](src/components/ServicesTerminal.tsx),
  the `$ load_module` prefix lines, and the noise-generator readout in
  [AboutSection.tsx](src/components/AboutSection.tsx) are all gone. These were
  content-free ornamentation — cutting them is a straight win against NN/g's
  aesthetic-and-minimalist-design heuristic and against `anti-slop.md`'s
  "decorative fake cursors/HUD" tell, not a regression.
- **New animation built correctly against the motion rules, first try.** The
  hero tag "launch" effect ([HeroSection.tsx](src/components/HeroSection.tsx) +
  [squashScroll.ts](src/lib/squashScroll.ts) + `.animate-tag-launch` in
  [index.css](src/index.css)) is: click-triggered only (never on load/scroll/hover),
  gated to `mode === 'full'`, and `useRenderMode` already forces `lite` mode
  under `prefers-reduced-motion: reduce` ([useRenderMode.tsx:17](src/hooks/useRenderMode.tsx)) —
  so reduced-motion users transparently get the plain `scrollIntoView` fallback.
  Only `transform`/`scroll` are animated, eased (`cubic-bezier`, `easeInOutCubic`),
  hard-capped at 1.2s. This matches `animation-principles.md` without needing
  a follow-up fix.
- **Font-family consistency.** Every literal `fontFamily: 'monospace'` in
  Header/WorkCase was swapped for `var(--font-mono)`, so the VT323 site-wide
  change actually reaches those inline styles instead of silently missing them.
- **Nav breakpoint (`md` → `lg`) closes a real gap**, not a cosmetic tweak:
  the old `md:` (768px) switch point was cramped for the current nav item
  count on tablet widths; hamburger and desktop nav toggle at the same
  breakpoint on both sides, so there's no dead zone where neither renders.

## Findings

### F-001 — `overflow-x: hidden` added at `html` scope masks the symptom, not the cause
**Severity: Low** (Impact: Low — no visible defect today; Probability: Medium — a
future wide element will fail silently instead of surfacing).

[index.css:120](src/index.css) adds `overflow-x: hidden` globally alongside the
new `text-size-adjust` iOS-zoom fix. `text-size-adjust` is a clean, targeted
fix. `overflow-x: hidden` is different in kind — it's a blanket suppressor: it
stops the symptom (horizontal scrollbar) without fixing whatever specific
element was overflowing. If something already overflows, it's now invisible;
sizing bugs introduced later will also just silently clip instead of showing
up as a scrollbar during dev.

**Recommendation:** fine to keep short-term, but worth a follow-up task to find
and fix the actual overflow source(s) — the squash-scroll transform on
`<main>` (`scale(1.05, 0.94)` etc. in [squashScroll.ts:24-31](src/lib/squashScroll.ts))
is a plausible contributor, since scaling an element can push its edges past
the viewport during the animation. Not urgent; flagging so it doesn't get
forgotten now that the symptom is hidden.

### F-002 — new dither/asset work not yet wired to a caller
**Severity: Minimal** (Impact: Low; Probability: Low — dead code risk only).

[DitherPreview.tsx](src/components/constellation/DitherPreview.tsx),
[ditherPreview.ts](src/lib/ditherPreview.ts), and
`src/assets/work-ethereal-path.jpg` (266KB, 1600×893) are untracked and, from
this diff alone, not visibly imported anywhere in the changed files. If
they're mid-flight for a follow-up commit this is a non-issue; flagging only
so they don't get committed as orphaned/dead code if the branch lands as-is.

## Notes — explicitly out of scope

- GDPR (cookie banner, privacy policy), security headers, and SEO basics: all
  present in the repo already (`CookieBanner.tsx`, `PrivacyPolicy.tsx`),
  untouched by this diff.
- Full anti-slop / heuristics sweep of the whole site: not re-run; this audit
  is scoped to the branch diff, and nothing in the diff introduces new slop
  tells (no gradients, no icon-box grids, no new buzzword copy).

## Risk summary

| ID | Finding | Impact | Probability | Severity |
|----|---------|--------|-------------|----------|
| F-001 | `overflow-x: hidden` masks unfixed overflow source | Low | Medium | Low |
| F-002 | Dither preview + new asset not yet wired up | Low | Low | Minimal |
