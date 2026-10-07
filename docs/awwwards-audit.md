# sinaida.eu: award readiness audit

Audited 7 October 2026 against the live site. Tracking issue: #102.
Juries in scope: Awwwards (Site of the Day, Developer Award), CSSDA, FWA.
Constraints held: strict motion law (nothing animates without user action), design system intact unless a finding says otherwise, jury impact and commission conversion weighted equally.

## Verdict

Estimated Awwwards jury score today: **7.0**. That sits inside Honorable Mention territory (6.5+) and about one point short of the Site of the Day bar (8.0+ after outlier trimming). The identity is strong and rare. Points are lost almost entirely on usability and polish, the 70% of the score that juries say decides most rejections.

| Criterion | Weight | Score | Why |
|---|---|---|---|
| Design | 40% | 7.0 | Distinctive system (Void, Geist Pixel, one red, CRT wordmark). Loses points on inconsistent headline treatment, an empty mobile first screen and a text-only work index. |
| Usability | 30% | 6.5 | Home is slow on phones (Lighthouse mobile 50), a footer link is dead, case studies sit three clicks deep, screen readers hear glyph noise. |
| Creativity | 20% | 7.5 | The neurotransmitter narrative and the work graph are original. The strongest asset (playable, hand-tracked pieces) lives behind clicks; the site itself never lets the visitor play. |
| Content | 10% | 7.5 | Clear service blocks with a concrete brief each, honest case pages with method diagrams. Missing outcomes, next-project flow and case pages for half the projects. |

Weighted: 0.4 × 7.0 + 0.3 × 6.5 + 0.2 × 7.5 + 0.1 × 7.5 = **7.0**.

Developer Award: blocked by mobile performance on the home page. CSSDA scores UX separately from UI and innovation; UX is the weak column. FWA rewards one bold interaction above polish; today there is no single moment a juror would screen-record.

## Corrections after re-measuring

Re-checked while fixing P0 (PR #116). Four findings below were wrong and are struck from the roadmap:

- **Findings 3 and P0 item 2:** live mobile perf on `/` is 86 to 96 with TBT around 70 ms over two clean runs. The 50 and 2,950 ms came from Lighthouse runs competing for one machine. The black frame did not reproduce. LCP of 2.2 to 3.2 s remains, caused by the hero ASCII reveal holding the final paint; that is a design choice. Developer Award is no longer blocked by performance.
- **Finding 4:** the second `h1` sits inside `<noscript>`; with JavaScript on there is one.
- **Finding 5:** hero glyph layers are already `aria-hidden` with one `sr-only` string, and the About scramble is marked `aria-busy` while it runs. The noise came from reading raw page text, which no screen reader announces.
- **Finding 8:** source maps are off on purpose to keep the source private (`vite.config.ts`).

With these corrections usability rises to about 7.0 and the estimate to about **7.2**.

## Evidence

Lighthouse, headless, live site. Full report and raw JSON were kept out of the repo.

| Route | Mobile perf | LCP | TBT | A11y | SEO |
|---|---|---|---|---|---|
| / | **50** | 3.9 s | **2,950 ms** | 100 | 100 |
| /work/redkie-ptitsy | 72 | | 510 ms | 100 | 100 |
| /collaborate | 84 | | | 100 | 100 |
| other routes | 90 to 92 | | | 100 (statement 96) | 100 (privacy 66, noindex on purpose) |

Desktop perf is 99 on every measured route. CLS is 0 everywhere. JS transfer is about 345 KB on every route.

Home mobile main thread: 4.6 s bootup, of which `ParticleField` takes 2.6 s and `index.js` 2.1 s. Largest bundles: `three.module` 667 KB, `index.js` 307 KB, `ParticleField.js` 212 KB. Nine canvases are live on the home page at once. In one Chromium pane the home page rendered as a fully black frame mid-scroll with no console errors; case pages rendered fine. Treat this as a GPU-pressure risk on jury machines until reproduced elsewhere.

## Findings

### Usability and engineering

1. **`/licensing` returns HTTP 404 on the live site.** The route exists in `src/App.tsx:60` and is linked from the footer, but it is not prerendered, so GitHub Pages answers with the 404 shell. Lighthouse cannot even load it. Any juror clicking the footer lands on an error status.
2. **`404.html` is a copy of the home shell**, so a missing page reports the home title and canonical. `NotFound.tsx:178` also logs a console error on every 404.
3. **Mobile home performance.** TBT of 2.95 s fails the Developer Award outright. The star field pays for all of three.js to draw points.
4. **Two `h1` on the home page** (hero plus the marquee name). Every other page has one.
5. **Screen readers hear noise.** The marquee name is in the DOM four times, About reads glitch glyphs character by character, the ASCII hero spans are read as punctuation. Lighthouse reports 100 because it cannot judge meaning; a juror running VoiceOver hears every glyph.
6. **No global `:focus-visible` style.** Only three components define one (`MoleculeBreak.tsx:61`, `NotFound.tsx:233`, `ui/button.tsx:8`). Keyboard users lose their place on dark ground.
7. **`/statement`:** links to case pages are distinguished by colour only, and the replay button’s `aria-label` does not match its visible text.
8. **Source maps missing** for large first-party bundles, which fails the best-practices audit on every route.
9. **Nav is hash-only** (`#work`, `#about`, `#services`); from a case page each item is a full reload to the home page.

### Design

10. **Headline treatment breaks the house rule.** Home (“Visual worlds for stage & screen”, “Human first. Digital second.”) and Experiences (“We build the room and what runs inside it”) alternate red and white words. The design rule is a red kicker over a solid white headline.
11. **Two type voices for headlines.** Home section headlines use a thin glowing sans, Experiences uses Geist Pixel at display size. Pick one display voice.
12. **Mobile first screen is empty.** The first frame is the name over stars; the positioning line and any work arrive only after scrolling. On phones the jury’s first five seconds show nothing that is yours alone.
13. **Work index is text-first.** The graph is clever, yet a juror sees words and tags before any image, and a case study needs node, then link, then page: three clicks.

### Content

14. **Four of eight projects have case pages.** Ethereal Path, Infinite Voidsong, Stereolove and Storm Glass have none; two of them sit in the home index.
15. **Case pages end without a way forward.** No next or previous project, no outcome block (audience, venue scale, press, client quote).
16. **One OG image for every route.** Shared case links all preview the same cover.

### What already scores

Prerendered routes with per-page titles and canonicals plus JSON-LD (`CreativeWork`, `BreadcrumbList`). Self-hosted Geist Pixel with preload and `font-display: swap`. WebP and AVIF with `srcset` and lazy loading. View Transitions between routes with a reduced-motion bypass (`RouteEnhancer.tsx:55`). YouTube embeds that load only on click, with a plain-language notice. No tracking cookies. A console easter egg. These are the things juries check first and most portfolios get wrong.

## Roadmap

Each item scored 1 to 5 for jury impact (J) and commission impact ©, with effort S (under a day), M (one to three days), L (a week). Every item obeys the motion law: anything that moves does so on scroll, hover, click or an explicit opt-in.

### P0: blockers (ship before any submission)

| # | Item | J | C | Effort |
|---|---|---|---|---|
| 1 | Prerender `/licensing` (and any client-only route); give `404.html` its own title, `noindex` and no console error | 4 | 3 | S |
| 2 | Home mobile performance: star field as one raw WebGL fragment shader without three.js, or three loaded after first scroll; at most two live canvases; reduced particle count under 768 px; target mobile perf 90+, TBT under 300 ms; reproduce and fix the black-frame report | 5 | 4 | M |
| 3 | Accessibility pass: `aria-hidden` on marquee copies, glitch layers and ASCII spans with one `sr-only` real string each; single `h1`; global red `:focus-visible` ring as a token; statement link underline and label fix; hidden source maps | 4 | 2 | S |
| 4 | Headline consistency: red kicker plus solid white headline everywhere, one display face for section headlines | 4 | 2 | S |

### P1: structure (moves the score from 7 to about 8)

| # | Item | J | C | Effort |
|---|---|---|---|---|
| 5 | Visual-first work index: keep the graph, show the work’s key frame on hover (desktop) and as inline frames on mobile; one click from index to case | 5 | 5 | M |
| 6 | Case page loop: next and previous project at the foot, an outcome block, per-case OG images | 4 | 4 | M |
| 7 | Case pages for Ethereal Path and Infinite Voidsong, or remove them from the home index until they exist | 3 | 4 | M |
| 8 | Mobile first screen: positioning line and one frame of real work inside the first viewport, revealed by the first touch | 4 | 4 | S |
| 9 | Neurochemical spine as navigation: a thin rail with the four molecules (noradrenaline, dopamine, serotonin, oxytocin) that fills as the visitor scrolls and doubles as section nav. Turns an existing idea into the site’s structure. | 5 | 3 | M |
| 10 | Real routes for Work, About, Services so the header works from every page | 3 | 3 | S |

### P2: signature moment (pick one)

The tagline already asks the question: *what if the world responded to you?* The site should answer it once, unmistakably, the moment a visitor asks for it to happen.

| Option | What happens | J | C | Effort | Risk |
|---|---|---|---|---|---|
| **A. Hands on (recommended)** | A single “use your hands” control in the hero opens the camera; on-device hand tracking from Aether Currents bends the star field and the wordmark. Nothing leaves the browser, and the notice says so. Off by default. | 5 | 5 | L | Camera permission friction, mid-range phone perf |
| B. Stage door | Clicking a work node collapses the star field into that project’s projection frame, which becomes the case page hero (View Transition plus one shader pass) | 4 | 3 | M | Two render systems to keep in sync |
| C. Sound on | A header toggle starts an Infinite Voidsong stream; the star field and the CRT wordmark breathe with it | 4 | 3 | M | Audio fatigue, autoplay policies need the click anyway |

Option A wins on both axes: it is the service demonstrated live, so a festival producer and a juror experience the same proof. B is the safer polish choice if camera access feels wrong for a first visit.

### P3: submission kit

| # | Item | Effort |
|---|---|---|
| 11 | Capture a 30 to 60 second screen recording of the signature moment and the case loop; six 1600 × 1200 stills | S |
| 12 | Submission copy, tags and credits; submit Awwwards first, then CSSDA, then FWA once the signature moment ships | S |
| 13 | Security headers are not settable on GitHub Pages; add a `Content-Security-Policy` meta tag and verify it does not block the YouTube click-to-load flow (not measured in this audit) | S |

## Suggested order

P0 as one branch (about two days), then P1 items 5, 6, 8 and 9 as a second, then the signature moment. Submit after P2, never before P0: a jury score is permanent for that URL and version.

## Sources

- [Awwwards judging criteria explained by a juror](https://www.hontran.dev/blog/awwwards-judging-criteria)
- [What award judges look for, Utsubo, 2026](https://www.utsubo.com/blog/award-winning-website-design-guide)
- [Immersive experiences in 2026 Awwwards winners](https://digitalstrategyforce.com/journal/why-are-immersive-experiences-dominating-the-2026-awwwards/)
- Weights (40/30/20/10) and thresholds come from secondary sources and should be checked on awwwards.com before submission.

<!-- Je suis le spectre d'une rose que tu portais hier au bal. -->
