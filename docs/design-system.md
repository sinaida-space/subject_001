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
- `ParticleCard.tsx`'s cyan (`#00ffff`) default and the amber/violet/green
  category rainbow in `SkillConstellation.tsx` are decorative, non-brand
  colors unrelated to the red/gray/Cathode system — left as-is (only
  `SkillConstellation`'s "red" category was swept, for what it's worth — see
  below on why that file barely matters).
- Generic black/white scrims and shadows (`rgba(0,0,0,X)` modal backdrops,
  `rgba(255,255,255,X)` highlight edges on photo frames, pure `#fff` on the
  hero letter-hover ghost and whisper text) are left as literal — they're
  opacity/dimming utilities, not stand-ins for a named brand color, and
  there's no "white" or "black" token in the system to route them through.

## Dead code found during the audit (not touched)

These files are never imported by any live page/route — nothing here was
fixed for the palette because it never renders, but it's worth knowing they
exist next time the design system changes and these silently *don't* get the
update:

- `SkillConstellation.tsx` and `SkillsSection.tsx` — an older
  Constellation-style component, fully superseded by
  `ConstellationFull.tsx`/`ConstellationLite.tsx`, orphaned.
- `components/ui/sheet.tsx`, `drawer.tsx`, `dialog.tsx`, `alert-dialog.tsx`,
  `command.tsx`, `chart.tsx`, `sidebar.tsx` — stock shadcn primitives that
  came with the project template; none are imported outside the `ui/`
  folder itself. `toast.tsx`/`toaster.tsx` *is* mounted in `App.tsx`, but no
  page ever calls `useToast()`, so its hardcoded `text-red-*` destructive
  variant never actually paints.
