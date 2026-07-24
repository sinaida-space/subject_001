# sinaida.eu — Website Audit
**Prepared for:** Sinaida Krivchenko &nbsp;·&nbsp; **Date:** 2026-07-24 &nbsp;·&nbsp; **Scope:** https://sinaida.eu (live production site) and its source repo (`sinaida-space/subject_001`, GitHub Pages hosting, static React/Vite SPA)

## Executive summary
The site is well-built for a one-person static portfolio: correct 404 handling (real HTTP 404 + a styled, on-brand error page), a genuine SEO/AI-crawler noscript fallback, no analytics or third-party trackers firing, and a cookie banner with equally-weighted Accept/Essential/Decline buttons. The one **Critical** finding is that the site's Google Fonts CDN call transmits visitor IP addresses to Google on every page load, before any consent choice — the exact pattern EU courts have ruled unlawful under GDPR, and it directly contradicts the site's own Privacy Policy claim that no third-party data is shared. The other real gaps are structural, not stylistic: **no HTTP security headers** (platform limitation of GitHub Pages, fixable by fronting with Cloudflare), **no skip-to-content link**, and a **repeated skipped-heading-level pattern** (section titles styled as `<div>`/`<span>` instead of real `<h2>`s) across four sections. Nothing here blocks the primary conversion action (contact), and the visual/motion/anti-slop craft is genuinely strong.

## Methodology
Audited against this skill's standard checklists: Nielsen Norman Group's 10 usability heuristics, WCAG 2.1 Level AA (w3.org/TR/WCAG21), GDPR (cross-checked against gdpr.eu), the security baseline, technical SEO, adaptive-performance strategy, font licensing, animation principles, and the anti-slop catalog. Verified live via HTTP headers (`curl -I`), rendered DOM/source inspection in-browser, and direct reading of the site's source (`src/`, `public/`, `index.html`, GitHub Actions deploy workflow). Each finding is rated independently on **Impact** and **Probability** and combined via `references/risk-matrix.md`.

## Risk summary

| # | Finding | Category | Impact | Probability | Rating |
|---|---|---|---|---|---|
| F-001 | Google Fonts loaded from Google's CDN, no consent gate | GDPR | High | High | **Critical** |
| F-002 | No HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) | Security | High | Medium | **High** |
| F-003 | No skip-to-content link | Accessibility | Medium | High | **High** |
| F-004 | Section titles skip heading levels (div/span instead of h2) | Accessibility | Medium | High | **High** |
| F-005 | Cookie consent not logged with timestamp/policy version | GDPR | Medium | Medium | **Medium** |
| F-006 | Privacy Policy has stale/inconsistent details | Content/GDPR | Medium | Medium | **Medium** |
| F-007 | VT323 used as body text at small sizes | Typography | Low | Medium | **Low** |

_(Sorted most severe first.)_

## Findings in detail

### F-001 — Google Fonts CDN call fires before consent
- **Category:** GDPR
- **Impact:** High — transmitting a visitor's IP address to a third country (Google, US) without a legal basis is a recognized GDPR violation; multiple EU courts/DPAs (notably LG München, and guidance echoed by several national DPAs) have specifically ruled the *dynamic* Google Fonts CDN call unlawful without explicit prior consent, since self-hosting removes the transfer entirely and costs nothing.
- **Probability:** High — this isn't a theoretical risk, it fires on literally every page load, for every visitor, right now, before the cookie banner is answered.
- **Rating:** **Critical**
- **Evidence:** `index.html` — `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` and `<link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">`, loaded unconditionally in `<head>`, not gated by the cookie-consent state in `CookieBanner.tsx`.
- **Why it matters:** The site's own Privacy Policy states data is processed only by "my hosting provider" and that there's no analytics/tracking — the Google Fonts call is an undisclosed third-party data transfer that contradicts that claim. Since it's a single free-to-fix line, this is the one item worth treating as a stop-the-line fix rather than batched with the rest.
- **Recommended remediation:** Self-host VT323 (download the `.woff2` from Google Fonts, serve it from `/public/fonts/`, reference via local `@font-face`) — removes the third-party call entirely, is faster (no cross-origin DNS/TLS round trip), and needs no CSP exception for `fonts.googleapis.com`/`fonts.gstatic.com`. This is exactly what `references/fonts.md`'s "always self-host" rule already recommends.

### F-002 — No HTTP security headers
- **Category:** Security
- **Impact:** High — missing `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, and `Referrer-Policy` leaves the site with no defense-in-depth against clickjacking, MIME-sniffing, or (if any future third-party script is ever added) unrestricted script injection.
- **Probability:** Medium — no known active exploit today (the site is a static SPA with no user input/backend), but the exposure is structural and would apply immediately to any future addition (embed, form, widget).
- **Rating:** **High**
- **Evidence:** `curl -I https://sinaida.eu` returns none of the headers above — confirmed this is a **GitHub Pages platform limitation**, not an oversight: GitHub Pages (served via Fastly, per the `via`/`x-served-by` response headers observed) does not support custom response headers on custom domains.
- **Why it matters:** Low urgency today given the site's simplicity, but it's the one item that can't be fixed by editing the repo — it requires a hosting/infrastructure decision.
- **Recommended remediation:** Front the domain with Cloudflare's free tier (DNS-only or proxied) and add the headers via a Transform Rule or a small Cloudflare Worker — this is the standard workaround for GitHub Pages' header limitation and requires no change to the deploy pipeline.

### F-003 — No skip-to-content link
- **Category:** Accessibility (WCAG 2.4.1, Level A)
- **Impact:** Medium — keyboard and screen-reader users must tab through the full nav (Work/About/Services/Contact/mode-toggle/Contact button) on every single page before reaching content.
- **Probability:** High — affects every keyboard/AT user, every page, every visit.
- **Rating:** **High**
- **Evidence:** No skip link markup found anywhere in `src/` (`grep` for "skip to content" / "skip-link" returns nothing); `Header.tsx` renders nav items directly with no bypass mechanism.
- **Why it matters:** This is one of the more consequential and cheapest-to-fix accessibility gaps — it's a single small, visually-hidden-until-focused link.
- **Recommended remediation:** Add a `<a href="#main" class="sr-only focus:not-sr-only ...">Skip to content</a>` as the very first focusable element in the DOM, and an `id="main"` on the main content wrapper.

### F-004 — Section titles skip heading levels
- **Category:** Accessibility (WCAG 1.3.1 / 2.4.6) + Anti-slop (heading hierarchy)
- **Impact:** Medium — screen-reader users navigate by heading level to build a mental map of the page; a jump from `h1` straight to `h3`/`h4` with no `h2` breaks that map and makes sections invisible to heading-based navigation.
- **Probability:** High — this is the pattern in at least four places, not a one-off: `ServicesTerminal.tsx` ("Services" section label is a plain `<div>`, followed directly by `<h3>` per service), `Collaborate.tsx` (same "Services" pattern), `SkillsSection.tsx` ("Capabilities" is a `<span>`, followed directly by `<h4>` per category — skipping both h2 and h3), and likely other `clinical-label`-styled section headers sitewide.
- **Rating:** **High**
- **Evidence:** `src/components/ServicesTerminal.tsx:44-47`, `src/components/SkillsSection.tsx:71-73`, `src/pages/Collaborate.tsx:95,112,139,161,212`.
- **Why it matters:** The visual design intent (small uppercase label, not a big heading) is fine — the fix is markup-level, not visual.
- **Recommended remediation:** Change these section-label elements from `<div>`/`<span>` to a real `<h2>` (or `<h3>` under the page's existing hierarchy) and keep the exact same CSS classes/styling — zero visual change, fixes the DOM semantics.

### F-005 — Cookie consent choice not timestamped or versioned
- **Category:** GDPR
- **Impact:** Medium — doesn't block core functionality (the checklist's real gate), but if consent is ever challenged, there's no record of *when* it was given or against *which* policy version.
- **Probability:** Medium — only becomes material if a policy update changes what's disclosed and a visitor's earlier consent needs to be distinguished from consent to the new version.
- **Rating:** **Medium**
- **Evidence:** `src/components/CookieBanner.tsx:14-27` — `localStorage.setItem('cookie-consent', 'accepted')` stores only the choice string, no timestamp or policy-version key.
- **Why it matters:** Minor today (the site collects almost no data), but cheap to fix permanently.
- **Recommended remediation:** Store an object (`{ choice: 'accepted', timestamp: Date.now(), policyVersion: '2026-03-08' }`) instead of a bare string.

### F-006 — Privacy Policy has stale/inconsistent details
- **Category:** Content / GDPR
- **Impact:** Medium — doesn't misstate legal rights, but contains details that don't match the current site.
- **Probability:** Medium — a visitor who actually reads the policy (the ones most likely to care) will notice.
- **Rating:** **Medium**
- **Evidence:** `src/pages/PrivacyPolicy.tsx` — name is given as "Zinaida Krivchenko" throughout (line 12, 96) rather than "Sinaida"; policy references "contact forms" (line 34, 41) but the live site has no form, only an obfuscated mailto link (`Collaborate.tsx` via `ObfuscatedMailto`); contact method listed is Telegram only (line 98), with no email address given despite email being the actual contact mechanism on the site; last-updated date (March 8, 2026) predates the current contact mechanism.
- **Why it matters:** Small trust/credibility gap for a site whose author has explicit expertise in the compliance/documentation space (biomedical regulatory background) — worth being airtight here specifically.
- **Recommended remediation:** Correct the name typo, update the data-collection section to reflect "email via a de-obfuscated mailto link" instead of "contact forms," add the email address as a stated contact method alongside Telegram, and bump the "last updated" date.

### F-007 — VT323 used as body text at small sizes
- **Category:** Typography / Anti-slop
- **Impact:** Low — VT323 is a deliberate retro-terminal/CRT display font, not one of `references/fonts.md`'s recommended body faces, and pixel-style fonts generally lose legibility below ~16px.
- **Probability:** Medium — mitigated: recent commits already show active attention to this exact issue ("raise text floor to 16px," "brighten constellation labels"), so this is a known, actively-managed trade-off rather than an overlooked default.
- **Rating:** **Low**
- **Evidence:** `tailwind.config.ts` font stack, `index.html` Google Fonts import, sitewide use per `font-clinical`/`font-mono` classes.
- **Why it matters:** This is a brand choice (the CRT/terminal aesthetic is core to the "sin.ai.da" identity), not a mistake — flagging for awareness, not urging a change.
- **Recommended remediation:** No action needed beyond what's already in progress; keep the 16px floor policy applied consistently to any new component.

## What's already working
- **404 handling is genuinely excellent**: real HTTP 404 status (`curl -I` confirms it, via the GitHub Actions workflow copying `index.html` → `404.html` for SPA routing) *and* a fully on-brand styled error page (glitch effect, ECG easter egg, working "return home" CTA) — this is exactly what `templates/404.md` asks for and most sites get wrong.
- **Cookie banner UX is correctly built**: Accept All / Essential Only / Decline All are equal-weight buttons, no dark pattern, links to the Privacy Policy, doesn't block core content — matches the GDPR checklist's core UX rule.
- **No analytics/tracking scripts found anywhere** in the shipped code — no GA, no Meta Pixel, no Hotjar/Clarity. The site's "no analytics" claim is true except for the Google Fonts gap in F-001.
- **Reduced-motion is honored consistently**: `prefers-reduced-motion` is checked in at least four separate components (`index.css`, `SectionBreak.tsx`, `SignalChain.tsx`, `DisplacementImage.tsx`, `useRenderMode.tsx`), including a full "lite" render mode toggle for low-GPU/motion-sensitive visitors — well above the bar most sites in this skill's audits clear.
- **SEO fundamentals are solid**: `robots.txt`, `sitemap.xml`, canonical tag, full Open Graph + Twitter Card tags, JSON-LD structured data (Person + CreativeWork), and a genuinely thorough `<noscript>` fallback with real page content for non-JS crawlers/AI agents — this is meaningfully above baseline.
- **Contact mechanism avoids the GDPR-form-disclosure problem entirely** by using an obfuscated mailto link instead of a data-collecting contact form — smart, low-maintenance choice for a single-person site.
- **Navigation** is 4 items, consistent placement, single level — clears the menu-design bar cleanly.
- **Heading hierarchy is otherwise correct** where it exists (single `<h1>` in the hero, sequential `<h2>`s in Gallery/About/Contact sections) — the gap in F-004 is confined to the specific div/span-styled section labels, not the whole site.

## Recommended next steps
F-001 is cheap (one font self-host swap) and closes the one item with real legal exposure — worth doing regardless of what else gets picked up. F-002 through F-004 are the next tier: F-002 needs an infrastructure decision (Cloudflare in front of GitHub Pages), while F-003 and F-004 are small, contained code changes with zero visual impact. F-005 through F-007 are backlog-tier, worth a batched pass whenever there's a slower week.

**This is a diagnosis, not a work order — tell me which findings (by number) you want turned into fixes, and in what order.**
