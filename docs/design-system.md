# Design System — Void · Chalk · cd0000

Streamlined 2026-07-25 on `260725_design-system`. Down from 36 ad-hoc color
values in the original audit to 9: **1 red, 2 neutrals, 5 grays, 1 accent.**

## The pairing

| Name | Hex | Role |
|---|---|---|
| **Void** | `#050505` | Dark ground — the site's primary mode. Maps to `--background` (dark theme). |
| **Chalk** | `#f6f6f6` | Light ground — print pages, lite/read mode. Maps to `--background` under `html[data-mode="lite"]`. |
| **cd0000** | `#cd0000` | The one brand red. Body text sits in chalk-tinted white or ink; red carries emphasis and interaction only — never decoration. Same red, same weight, on both grounds. Canonical CSS variable: `--sinaida-red`. `--primary` / `--accent` / `--ring` / `--neon-glow` all point to it. |

Previously the site carried at least three reds in practice: `--primary`
(hue 352, `#BF0D25`), `--accent` (hue 0, `#FA0000`), and a hardcoded
`#ff3333` scattered across ~15 component files (Header's Contact button,
the whole ContactChannel/Collaborate section, NotFound, WorkCase,
ProjectDetail, SignalChain, and others) that never went through either
token. All three now resolve to `--sinaida-red` (`cd0000`), with one
deliberate carve-out below.

**2026-07-25 follow-up:** the Header "Contact" button and the Collaborate
page still looked like a different red after the first pass — because they
were, literally: they'd always used hardcoded `#ff3333`, never `--primary`/
`--accent`, so the token unification never reached them. Fixed by sweeping
every hardcoded `#ff3333` / `#fa0000` / `rgba(255,51,51,*)` in the codebase
over to `--sinaida-red` (borders, glows, decorative fills) or
`--primary-legible` (actual small readable text — see below).

`--primary-legible` (the AA-safe variant for small text — labels, eyebrows,
~12–16px) is `hsl(0 100% 52%)`, confirmed at 5.14:1 against Void — comfortably
past the 4.5:1 floor. Raw `--sinaida-red`/`--primary` only measures **3.5:1**
against Void, which fails AA for normal text (it's fine for large/bold
headings — 3:1 threshold — and for borders/UI components, also a 3:1
threshold). Rule of thumb used throughout the sweep:

- Borders, decorative glows/shadows, large or bold headings → raw `--sinaida-red`
- Small readable text (buttons, labels, inline emphasis) → `--primary-legible`
- A solid red fill with black text on top (button hover states) → background
  also needs `--primary-legible`, not raw `--sinaida-red` — black-on-cd0000
  only clears ~3.6:1, black-on-primary-legible clears ~5.3:1

## Glow — one shade, five intensities

Every red glow in the system is the same red at different alpha. Don't invent
a second glow color.

| Intensity | Alpha | Use |
|---|---|---|
| Core | `.55` | Active/focused state |
| Strong | `.35` | Hover |
| Medium | `.2` | Idle emphasis |
| Ambient | `.1` | Background presence |
| Whisper | `.05` | Barely-there texture |

## Gray scale

Five even steps between Void and Chalk, replacing the scattered `#333` /
`#555` / `#666666` / `#888` / `#ccc` that had accumulated with no shared rule.
Each step has one job — don't reach for a neighboring step "because it looked
close enough."

| Name | Hex | HSL token | Job |
|---|---|---|---|
| **Graphite** | `#262626` | `--graphite` | Structural — panel edges, dividers on dark ground |
| **Gunmetal** | `#4d4d4d` | `--gunmetal` | Disabled states, secondary borders |
| **Slate** | `#737373` | `--slate` | The workhorse — secondary text on either ground |
| **Fog** | `#999999` | `--fog` | Muted labels, timestamps, captions |
| **Haze** | `#cccccc` | `--haze` | Faint dividers on light ground, near-white chrome |

Available as Tailwind utilities: `text-graphite`, `bg-slate`, `border-fog`,
etc.

## Accent — Cathode

`#a7bebe` — the site's existing clinical teal-gray, renamed to fit the
Static/Phosphor CRT naming thread. Token: `--cathode` (was `--clinical`,
same value, `180 15% 70%`). The only non-red, non-neutral color kept from
the audit — reserved for the clinical/ECG accent register, never a second
brand color.

## 2026-07-26 — full codebase audit

Went through all 118 `.ts`/`.tsx`/`.css` files line by line for any hardcoded
color — hex, `rgb()`/`rgba()`, literal `hsl()`, or named colors — that should
have been a design-system token. Found and fixed real drift beyond the
`#ff3333` sweep above:

- **`NotFound.tsx`** was still painting its page background with the *old*
  pre-redesign Void value, `hsl(280 33% 3%)` (purple-tinted), instead of the
  current `--background`. The 404 page silently didn't match the rest of the
  site's black.
- **`Logo.tsx` and `NotFound.tsx`**'s canvas-drawn ECG heartbeat lines both
  used a hardcoded `hsl(0 100% 55%)` — a *third* red lightness value,
  independent of both `cd0000` (40%) and `--primary-legible` (52%). Realigned
  both to `hsl(0 100% 52%)` (with a comment — canvas can't read `var()`, so
  this has to stay a literal, but now it's the *same* literal as the token).
- **`ConstellationFull.tsx`**'s animated playhead sweep was drawn in
  `rgba(255,59,82,*)` / `rgba(255,80,100,*)` — its own comment calls this
  "ECG-red," but neither value is `cd0000`. **`VideoEmbed.tsx`**'s play-button
  glow had the same `rgba(255,59,82,0.4)`, next to a border that already
  correctly used `border-primary`. All four now use the real red
  (`rgba(205,0,0,*)` in canvas, `hsl(var(--sinaida-red) / 0.4)` in the DOM).
- **`#1a1a1a`**, a near-black used for structural borders/dividers in
  `SnakeEasterEgg.tsx`, `SignalChain.tsx`, and `WorkCase.tsx` — exactly
  Graphite's documented job — is now `--graphite` everywhere (`#262626` literal
  only where a `<canvas>` fillStyle forces it).
- **`SnakeEasterEgg.tsx`**'s modal chrome used two more near-Void one-offs,
  `#060606` and `#0a0a0a`, instead of `--background`.
- **`.notice-surface a:hover`** was `#ff6b6b` with no token behind it at all —
  added `--primary-hover` (`hsl(0 100% 71%)`) so it's the same "one step
  brighter" logic as `--primary-legible`, not an orphaned literal.
- **`ConstellationFull.tsx`**'s `SKILL_LABEL_REST` was `#f0efe9` — a
  one-character drift from `#f2efe9`, the off-white used for the exact same
  "research/project" role in three other places (`graph.ts`,
  `ConstellationLite.tsx` ×2, `ConstellationFull.tsx` ×2). Consolidated all
  five into one export, `OFF_WHITE`, from `graph.ts` — the typo could not have
  been caught by eye, only by the values disagreeing.
- **`Header.tsx`**'s mobile full-screen menu reimplemented `--background` and
  `--foreground` from scratch as `'#ffffff'`/`rgba(4,4,4,0.97)` and
  `'#0a0a0a'`/`'#ffffff'`, and three more spots used raw
  `rgba(255,255,255,X)`/`rgba(0,0,0,X)` pairs as a manual stand-in for
  `--foreground` at various opacities. All now route through the actual
  tokens (alphas preserved exactly where they'd been deliberately tuned
  differently between light/dark).

## 2026-07-26 — second pass (`260726_color-audit`)

Re-ran the same sweep, widened to files the first pass didn't cover (`index.html`,
`public/*.svg`). Four things were still off-system:

- **`index.html`'s `theme-color`** was `#bf0d25` — the retired pre-redesign
  `--primary`. That value paints the browser chrome on mobile, so the first
  thing a phone visitor sees framed the site in the old red. Now `#cd0000`.
- **`public/favicon.svg`** carried both retired values: `#07050a` (the old
  purple-tinted Void) as its ground and `#ff3333` as the ECG stroke. Now
  `#050505` / `#cd0000`. The raster icons (`favicon.ico`, `icon-192.png`,
  `apple-touch-icon.png`) are baked images and still show the old red —
  they need regenerating from the SVG.
- **`VHSOverlay.tsx`**'s color-shift gradient used `hsl(0 100% 55%)` and
  `hsl(0 100% 30%)` — a fifth and sixth red lightness, neither a token. It
  renders on the 404 page. Now `--primary-legible` / `--sinaida-red`, which
  keeps the bright/dark two-tone the gradient wanted.
- **`ConstellationFull.tsx`**'s project-node dot was pure `#ffffff` while the
  label right next to it drew in `OFF_WHITE` — the dot read colder than its
  own text. Both are `OFF_WHITE` now.

`src/App.css` was the stock Vite template stylesheet (`#646cffaa`,
`#61dafbaa`, `#888`) — nothing imported it, so it's deleted rather than
tokenized (see the 2026-07-26 dead-code sweep below).

## What's intentionally out of scope

- `--destructive` and the `--sidebar-*` tokens are unrelated shadcn
  boilerplate (no `Sidebar` component is mounted anywhere on the site) —
  left untouched.
- Lite mode's `--accent` (`hsl(0 0% 8%)`, near-black ink) stays as-is. Lite
  mode is a deliberate flat black-and-white read mode with no color and no
  motion; giving its accent the brand red would undercut that design intent,
  even though the palette demo shows red CTAs on a light ground in general.
- `--neon-magenta`, `--bloom-cyan`, `--particle-white` are effect-specific
  values (starfield/particle system), not part of the brand palette audit.
- `SnakeEasterEgg.tsx`'s gameplay red (`#CC1414`, used for the snake/food
  sprite itself) is a tuned Easter-egg asset left as-is; only its structural
  chrome (borders, near-Void backgrounds) and its one CSS-token usage (the
  ECG line overlay) were swept.
- `graph.ts`'s `CATEGORY_COLORS` ramp (`tech`/`strategy`/`analytical`/`research`)
  is a deliberate red→off-white gradient for the Constellation diagram, not
  accidental duplicates — only `direction` (the literal brand red) was swept.
- `ParticleCard.tsx`'s cyan (`#00ffff`) default is a decorative, non-brand
  color unrelated to the red/gray/Cathode system — left as-is. (`graph.ts`'s
  category ramp, above, is the only other place a deliberate non-brand
  color lives — `SkillConstellation.tsx`, which had its own rainbow, is gone;
  see the dead-code sweep below.)
- Generic black/white scrims and shadows (`rgba(0,0,0,X)` modal backdrops,
  `rgba(255,255,255,X)` highlight edges on photo frames, pure `#fff` on the
  hero letter-hover ghost and whisper text) are left as literal — they're
  opacity/dimming utilities, not stand-ins for a named brand color, and
  there's no "white" or "black" token in the system to route them through.

## Dead code found during the audit — removed 2026-07-26

Originally logged here as "found, not touched" — swept for real on
`260726_color-audit` once it was clear none of it was reachable from any
route:

- `SkillConstellation.tsx` and `SkillsSection.tsx` — an older
  Constellation-style component, fully superseded by
  `ConstellationFull.tsx`/`ConstellationLite.tsx`. Already gone by the time
  of the second pass (removed in an earlier, undocumented commit).
- The entire `components/ui/` shadcn scaffold except `button.tsx` (the one
  primitive actually used, by `CookieBanner.tsx`): `accordion`, `alert`,
  `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`,
  `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`,
  `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`,
  `hover-card`, `input-otp`, `input`, `label`, `menubar`, `navigation-menu`,
  `pagination`, `popover`, `progress`, `radio-group`, `resizable`,
  `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`,
  `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`,
  `toaster`, `toggle`, `toggle-group`, `tooltip`, plus `ui/use-toast.ts` and
  `hooks/use-toast.ts`. `toast.tsx`/`toaster.tsx` and `sonner.tsx`/`tooltip.tsx`
  *were* mounted in `App.tsx` (as was `@tanstack/react-query`'s
  `QueryClientProvider`), but nothing anywhere ever called `useToast()`,
  `toast()`, or `useQuery()` — the wiring rendered nothing and did nothing.
  `App.tsx` now renders `RenderModeProvider` → `BrowserRouter` directly.
- Pruned the now-unreachable dependencies from `package.json`:
  `@hookform/resolvers`, every `@radix-ui/react-*` package except
  `react-slot` (button's dependency), `@tanstack/react-query`, `cmdk`,
  `date-fns`, `embla-carousel-react`, `input-otp`, `next-themes`,
  `react-day-picker`, `react-hook-form`, `react-resizable-panels`,
  `recharts`, `sonner`, `vaul`, `zod`. Verified with `npm run build` and
  `vitest run` after the prune — both clean.

## 2026-07-30 — Typography: VT323 → Geist Pixel

Replaced VT323 with Google's Geist Pixel, self-hosted the exact same way
VT323 was: two `.woff2` files in `public/fonts/`, loaded via `@font-face` in
`src/index.css`, no runtime call to Google Fonts' CDN. That's a privacy
choice, not a performance one — a CDN `<link>` fires before the cookie
banner is dismissed, sending the visitor's IP to Google on every page load.

**Scope**: weight 400 only, `latin` + `latin-ext` subsets, matching VT323's
scope exactly. No Cyrillic subset — the site carries zero Cyrillic UI text.
No additional weights.

**Wired to three CSS custom properties** (`src/index.css`, `:root`), each
with a metrically-close system fallback stack so `font-display: swap`
doesn't cause a visible reflow once the webfont loads in:

- `--font-display`: `'Geist Pixel', system-ui, -apple-system, 'Segoe UI', sans-serif`
- `--font-mono`: `'Geist Pixel', ui-monospace, 'SFMono-Regular', 'Menlo', monospace`
- `--font-clinical`: `'Geist Pixel', ui-monospace, 'SFMono-Regular', 'Menlo', monospace`

**Size-scale compensation, recalibrated, not copied**: VT323's named
Tailwind scale (`tailwind.config.ts`, `extend.fontSize`) had been redefined
at Tailwind's stock defaults × 1.25 with a 20px floor, because VT323 reads
noticeably smaller than its declared px value. Geist Pixel does not have
that problem — it runs the other way. Measured with
`ctx.measureText('H').actualBoundingBoxAscent` at a shared 100px reference:
VT323's cap-height is 56px (ratio 0.56), Geist Pixel's is 72.2px (ratio
0.722) — Geist Pixel already renders about 29% fuller than VT323 at an
identical declared size, comfortably past the 1.25× boost VT323 needed to
read "right." So the × 1.25 multiplier is dropped entirely: `fontSize` in
`tailwind.config.ts` is now Tailwind's untouched stock scale. The mobile
floor dropped from 20px to 16px in step with the same ratio
(20 × 0.56⁄0.722 ≈ 15.5, rounded to 16). The matching arbitrary-value
overrides in `src/index.css` (`.text-[9px]` … `.text-[15px]`) clamp to the
same 16px floor; `text-[16px]` and above are left at their literal value —
no scaling needed above the floor.

Confirmed at mobile (375px) and desktop (1280px) widths on the homepage
hero and the Constellation section (both the canvas-drawn
`ConstellationFull.tsx` labels and the SVG-drawn `ConstellationLite.tsx`
labels) — proportionate, no tiny/overflowing text.

**Files touched**: `src/index.css` (`@font-face` blocks + the three CSS
vars + the arbitrary-value overrides), `tailwind.config.ts` (`fontFamily`
+ `fontSize`), `index.html` (preload `<link>`), `ConstellationFull.tsx`
(canvas 2D context `ctx.font` string — canvas ignores `@font-face` unless
the family string matches literally), `ConstellationLite.tsx` (SVG
`fontFamily` prop). `public/fonts/vt323-latin.woff2` and
`vt323-latin-ext.woff2` deleted; replaced by `geist-pixel-latin.woff2` and
`geist-pixel-latin-ext.woff2`.
