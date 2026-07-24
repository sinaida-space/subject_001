# sinaida.eu — Website Audit (re-audit)
**Prepared for:** Sinaida Krivchenko &nbsp;·&nbsp; **Date:** 2026-07-24 (second pass, post-remediation) &nbsp;·&nbsp; **Scope:** https://sinaida.eu live production site, all five routes, and its source repo (`sinaida-space/subject_001` @ `main` / `2c6fdc0`)

---

## Remediation record (added 2026-07-24, after this audit was commissioned into fixes)

All eleven findings were actioned on branch `fix/audit-2026-07-24-round2`, plus one further finding (F-012) discovered during the fix work. Verified against a local production build, not just source.

| # | Rating | Status |
|---|---|---|
| F-001 | High | **Fixed** — policy now describes GitHub Pages and Fastly, with each provider's own transfer safeguard and legal basis |
| F-002 | High | **Fixed** — build-time prerender writes per-route title, description, canonical, og/twitter tags |
| F-003 | High | **Fixed** — 3.26 MB → 48 KB (WebP + JPEG fallback, two widths, lazy, explicit dimensions) |
| F-004 | High | **Fixed pending DNS move** — CSP and Referrer-Policy set via meta tags; the remaining headers already exist on Cloudflare and reach visitors once the apex is proxied. See F-013. |
| F-005 | Medium | **Fixed** — three inert consent buttons replaced with an accurate one-button storage notice |
| F-006 | Medium | **Fixed** — all eight rights listed, plus one-month/free-first-copy timing and an Art. 22 statement |
| F-007 | Medium | **Fixed** — "Storage Notice" control added to the footer, reopens the notice |
| F-008 | Low | **Fixed** — marketing and custom-fonts claims removed |
| F-009 | Medium | **Fixed** — link recolored to `accent`, contrast 3.03:1 → 4.65:1 |
| F-010 | Low | **Fixed** — hamburger now ends 11 px inside a 320 px viewport; layout above `sm:` unchanged |
| F-011 | Low | **Fixed** — OG image re-exported 1200×630, 964 KB → 124 KB |
| F-012 | High | **Fixed** — YouTube thumbnails leaked visitor IPs to Google; see below |
| F-013 | High | **Fixed pending DNS move** — Cloudflare was attached only to `www`, which redirects away from it; see below |

### F-012 — YouTube thumbnails sent visitor IPs to Google before consent
- **Category:** GDPR
- **Impact:** High — transmitting a visitor's IP address to Google without a legal basis is the same defect class as the Google Fonts finding rated Critical in the first audit. It also directly contradicted the privacy policy's statement that only the hosting providers receive data.
- **Probability:** High — fired on load, on every work case page and every project modal reachable from the homepage.
- **Rating:** **High**
- **Evidence:** `VideoEmbed.tsx:43` loaded its poster from `https://img.youtube.com/vi/<id>/hqdefault.jpg`. The component correctly deferred the YouTube *iframe* until a click, so the expensive and cookie-setting part was already gated; the poster image was not. Confirmed live: `img.youtube.com` appeared in the resource host list on `/work/redkie-ptitsy/` with no interaction.
- **Why it matters:** The facade pattern exists precisely to keep Google out of the picture until the visitor asks for video. Loading the poster from Google defeated it, quietly, on the pages most likely to be shared.
- **Remediation applied:** All eight poster images downloaded once and self-hosted from `/public/video-posters/<id>.jpg` (96 KB total). Google is now contacted only after the visitor presses play. A new "Embedded video" section in the privacy policy discloses exactly that. Verified: the only resource host on a work case page is now `sinaida.eu`, and the YouTube iframe still loads correctly on click.

### F-013 — Cloudflare is attached only to `www`, which redirects away from it
- **Category:** Security / GDPR accuracy
- **Impact:** High — the security headers added after the first audit are real and correct, and no visitor ever receives them. The same split also meant F-001's remediation, written from apex DNS evidence, described the processor chain incompletely.
- **Probability:** High — applies to all traffic, continuously.
- **Rating:** **High**
- **Evidence:** `dig www.sinaida.eu` returns `188.114.96.9` / `188.114.97.9`, Cloudflare address space; `curl -I https://www.sinaida.eu` returns `server: cloudflare`, a `cf-ray` header, and the full intended header set (`strict-transport-security: max-age=31536000; includeSubDomains`, `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy: geolocation=(), microphone=(), camera=()`). That response is a `301` to `https://sinaida.eu/`. The apex resolves to `185.199.108-111.153` (GitHub Pages), returns `server: GitHub.com`, and carries none of those headers. `https://sinaida.eu/cdn-cgi/trace` returns 404, confirming the apex is outside Cloudflare; the same path on `www` returns a valid Cloudflare trace (`colo=PRG`).
- **Why it matters:** Three separate consequences. The hardening does nothing for real traffic. Cloudflare's analytics records only redirect hops, so the numbers in that dashboard are not visitor numbers. And Cloudflare genuinely is a processor for anyone who types `www`, including via Network Error Logging to `a.nel.cloudflare.com`, which the privacy policy did not disclose.
- **Remediation:** Sinaida has decided to proxy the apex. Once the apex nameservers move to Cloudflare and the apex record is proxied, the existing Transform Rule covers all traffic and F-004 closes completely. The privacy policy and storage notice in this branch have been rewritten for that proxied chain, and the CSP now permits Cloudflare's analytics beacon. **These changes assume the apex is proxied. Complete the DNS move before or at the same time as merging this branch, otherwise the policy over-discloses Cloudflare in the same way the previous version did.**

### Revised status of F-004
Reclassified from "partially fixed, needs a hosting decision" to **fixed pending the DNS move**. The Cloudflare account, zone, and Transform Rule already exist and demonstrably emit the correct headers. The only missing step is pointing the apex through them.

### Verification performed
Production build (`npm run build`) served locally and exercised in-browser:
- Resource host list on the homepage and on `/work/redkie-ptitsy/`: **`localhost` only**. YouTube appears only after pressing play.
- `dist/work/redkie-ptitsy/index.html` → own title and `canonical="https://sinaida.eu/work/redkie-ptitsy/"`. `/privacy/`, `/booking/`, `/press/` carry `noindex, follow`; `/booking/` and `/press/` canonicalize to `/collaborate/`.
- Portrait resolves to `sinaida-photo-1200.webp` at 48 KB.
- Storage notice link contrast **4.65:1** in dark mode, 18.42:1 in lite mode.
- 320 px header: no element exceeds the viewport; hamburger right edge at 309 px.
- Footer "Storage Notice" button aligns pixel-identically with the Privacy Policy link and reopens the notice.
- Content-Security-Policy breaks nothing: no console errors, WebGL starfield, self-hosted font, lite mode and the YouTube iframe all work under it.
- `npx tsc --noEmit` clean, `vitest` passing, `eslint` clean on every changed file.

After F-013 was found, additionally:
- Privacy policy rewritten for the three-provider chain (Cloudflare → GitHub Pages → Fastly), with a new Analytics section naming Cloudflare Web Analytics, the `static.cloudflareinsights.com` script, the legal basis, the balancing of that interest against the visitor's privacy, and the route to object. A stale line reading "I do not currently use a dedicated analytics service" was found and removed, since it would have contradicted the new section outright.
- Storage notice text corrected. Its claim of "no analytics or tracking" would have become false the moment the apex was proxied.
- CSP amended to permit `static.cloudflareinsights.com` and `cloudflareinsights.com`. Without this the injected beacon is blocked and the analytics fails silently.
- **Consent-version comparison was not implemented.** `PRIVACY_POLICY_VERSION` was recorded with every acknowledgement but never read back, so a policy change could never re-prompt anyone; the banner only checked whether any record existed. Now compares the stored version and re-shows the notice when it differs, treating an unparseable or legacy bare-string record as unacknowledged. Verified by seeding a record at the previous version and confirming the notice reappears and the record updates.
- Version bumped to `2026-07-24-2`, so visitors who acknowledged the earlier text today (which stated no analytics were in use) are shown the corrected disclosure.

### Consent requirement, assessed rather than assumed
Every storage and processing operation on the site was checked against ePrivacy Art. 5(3) and GDPR Art. 6, and **none of them requires consent**:

| Operation | Analysis | Consent |
|---|---|---|
| Display-mode preference in `localStorage` | User-set interface preference, chosen by the visitor's own action; Art. 5(3) strictly-necessary exemption | Not required |
| Notice-acknowledgement key | Exists solely to honour the dismissal the visitor requested | Not required |
| Cloudflare zone analytics | Measured at the edge from Cloudflare's own request logs. Nothing is stored on or read from the device, so Art. 5(3) never engages. IP processing rests on Art. 6(1)(f) legitimate interest, with the balancing recorded in the policy and the right to object live | Not required |
| Cloudflare security cookie | Set only when verifying a request is not automated; strictly necessary for security, explicitly exempt. Verified as not currently firing (no `Set-Cookie` under a browser user agent on any route) | Not required |
| YouTube player | Loads on the visitor's click, which is the legal event; the poster is served locally | Not required |

Verified empirically at the Cloudflare edge with a browser user agent: no `Set-Cookie` on any route, no `/cdn-cgi/` script injection, no challenge-platform or Turnstile script, and a response body byte-identical to the origin (7708 bytes). Cloudflare is passing content through untouched.

The transfer basis cited for Cloudflare is the Standard Contractual Clauses in its Data Processing Addendum. The EU-U.S. Data Privacy Framework was deliberately **not** cited, since certification can lapse and the SCCs hold regardless.

**Consequence for the banner:** Accept and Reject controls would be misleading, since nothing is rejectable. The notice is informational with a single dismiss control.

Final copy, one line on desktop:

> **Cookie notice**
> No tracking cookies. Visit statistics are aggregate only: pages, country, device type. [Privacy Policy] &nbsp;&nbsp; [GOT IT]

80 words reduced to 14; rendered height from roughly five lines to one (103 px desktop, three lines on a 375 px phone). Link contrast 4.65:1, body 9.19:1, both clearing AA.

**Layered notice, deliberately.** The banner names no processor. Naming Cloudflare in a one-line first layer costs space and tells the visitor nothing they can act on. Art. 13 requires the information be *provided*, not that it all sit in the banner, and the WP29 Transparency Guidelines endorse exactly this layered approach. The full disclosure lives one click away in the privacy policy, which names Cloudflare, GitHub and Fastly, the data categories (pages, country, device type, referrer, delivery speed), the legal basis, the balancing test, the transfer safeguard and the right to object.

Note that omitting the vendor from the banner is a copy decision with no security dimension either way: a site's CDN is public information, readable from DNS records and response headers by anyone who looks. The policy must keep naming Cloudflare regardless, because a processor disclosure that omits the processor is not a disclosure.

### Apex proxying: verified complete (2026-07-24, after the DNS move)

Delegation now sits with Cloudflare (`chase.ns.cloudflare.com`, `mia.ns.cloudflare.com`) and the apex resolves to Cloudflare proxy addresses (`188.114.96.9` / `188.114.97.9`). `curl -I https://sinaida.eu` at the edge returns:

```
server: cloudflare
cf-ray: a2057a9779b790a2-PRG
strict-transport-security: max-age=31536000; includeSubDomains
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: geolocation=(), microphone=(), camera=()
```

GitHub Pages and Fastly remain the origin behind it (`via: 1.1 varnish`, `x-served-by: cache-fra-...`). No `Set-Cookie` on the response. NEL is active on the apex, which the privacy policy discloses. **F-004 and F-013 are fully closed.**

One correction found during this verification, and it matters because it is the same defect class the whole audit has been about. The policy draft stated the analytics "works through a small script loaded from Cloudflare on each page, served from static.cloudflareinsights.com." That is false: the apex HTML served through Cloudflare is byte-identical to the origin (7708 bytes), contains no `cloudflareinsights` reference and no `/cdn-cgi/` injection. What is enabled is Cloudflare's **server-side zone analytics**, derived from request logs at the edge, with no browser-side script at all. Corrected:

- The Analytics section now describes server-side measurement from request data, and states explicitly that no script for it runs in the visitor's browser.
- `static.cloudflareinsights.com` and `cloudflareinsights.com` were removed from the CSP, since permitting origins the site does not use weakens the policy for no benefit. The exact strings to re-add are recorded in a comment in `index.html`, next to a note that enabling Web Analytics later without them will cause the beacon to be blocked silently.

### Still open — action required outside the repo

**Nothing blocking.** The apex DNS move is done and verified above.

Two things to keep in view rather than act on:

- HSTS with `includeSubDomains` and a one-year max-age is now binding for the whole domain, so any future subdomain that cannot serve valid HTTPS will be unreachable until it can. `the-eyes-chico.sinaida.eu` serves HTTPS correctly and is fine. The certificate on the apex lists only `sinaida.eu` and `www.sinaida.eu`.
- If Cloudflare **Web Analytics** is ever switched on in the dashboard, two things must change together: the CSP allowances in `index.html`, and the Analytics section of the privacy policy. Enabling it without the first causes a silent failure; without the second, the policy understates what runs in the visitor's browser.

### Also left deliberately
- The original `public/sinaida-photo.jpg` (3.26 MB) and `public/og-skills.png` (964 KB) are now unreferenced but still present, so they still deploy and remain publicly fetchable. They cost nothing in page weight. Deleting them is a call to make deliberately, so they were left in place.

---

## Executive summary
This is a second audit of the same site, run after this morning's remediation commit (`2c6fdc0`) closed five of the seven findings from the first pass. Those fixes are verified live and hold up: VT323 is self-hosted, zero third-party requests fire, the skip link and heading hierarchy are correct, and consent is now timestamped and policy-versioned. What the deeper pass surfaced is a different class of problem — three issues where the site **describes itself inaccurately to machines and to visitors**. The most consequential is the Privacy Policy, which names Cloudflare as a data processor handling visitor IP addresses under Standard Contractual Clauses; Cloudflare is not in this site's delivery chain at all (DNS resolves straight to GitHub Pages, served by Fastly). Alongside it: every route on the site declares the homepage as its canonical URL, which tells search engines to drop the case-study pages, and a 3.26 MB portrait is being shipped to render a 258-pixel avatar. None of these break the site; all three quietly undercut the work it is supposed to do.

## Methodology
Audited against this skill's standard checklists: Nielsen Norman Group's 10 usability heuristics, WCAG 2.1 Level AA (w3.org/TR/WCAG21), GDPR (cross-checked against gdpr.eu), the security baseline, technical SEO, adaptive-performance strategy, font licensing, typography, animation principles, and the anti-slop catalog. Verified by: live HTTP header and status-code inspection across all routes (`curl -I`), DNS/ASN resolution to confirm the actual delivery chain, rendered-DOM inspection in-browser, programmatic WCAG contrast computation across every rendered text node, reflow testing at 320 px and 375 px, keyboard focus-order and focus-visibility testing, resource-weight measurement (uncompressed and gzipped), and direct reading of `src/`, `public/`, `index.html` and the deploy output. Each finding is rated independently on **Impact** and **Probability** and combined via `references/risk-matrix.md`.

## Status of the previous audit's findings

| Prior # | Finding | Status |
|---|---|---|
| F-001 | Google Fonts CDN call before consent | **Closed** — VT323 self-hosted at `/fonts/vt323-latin.woff2`, preloaded; zero non-`sinaida.eu` hosts in the resource log |
| F-002 | No HTTP security headers | **Open** — carried forward as F-004 below |
| F-003 | No skip-to-content link | **Closed** — `App.tsx:47-53`, first focusable element, `#main-content` target present |
| F-004 | Section titles skip heading levels | **Closed** — homepage heading tree is now h1 → h2 → h3 with no skips |
| F-005 | Consent not timestamped/versioned | **Closed** — `CookieBanner.tsx:20-24` stores choice, ISO timestamp, and `PRIVACY_POLICY_VERSION` |
| F-006 | Privacy Policy stale details | **Partially closed** — name and contact corrected, but new inaccuracies introduced; see F-001, F-006, F-008 |
| F-007 | VT323 as body text | **Accepted** — deliberate brand choice, 16 px floor applied; no action |

## Risk summary

| # | Finding | Category | Impact | Probability | Rating |
|---|---|---|---|---|---|
| F-001 | Privacy Policy names Cloudflare as processor; Cloudflare is not in the chain | GDPR | Medium | High | **High** |
| F-002 | Every route declares the homepage as its canonical URL | SEO | Medium | High | **High** |
| F-003 | 3.26 MB portrait served to render a 258 px avatar | Performance | Medium | High | **High** |
| F-004 | No HTTP security headers (carried forward, unremediated) | Security | High | Medium | **High** |
| F-005 | All three consent buttons produce identical behavior | GDPR | Medium | Medium | **Medium** |
| F-006 | Rights section lists 4 of 8 GDPR rights | GDPR | Medium | Medium | **Medium** |
| F-007 | No way to withdraw consent after the banner is dismissed | GDPR | Medium | Medium | **Medium** |
| F-008 | Privacy Policy contains stale claims (marketing, fonts) | Content | Low | Medium | **Low** |
| F-009 | Cookie banner's Privacy Policy link fails AA contrast | Accessibility | Low | High | **Medium** |
| F-010 | Mobile menu button clipped at 320 px | Accessibility | Medium | Low | **Low** |
| F-011 | OG image is the wrong aspect ratio and 964 KB | SEO | Low | Medium | **Low** |

_(Sorted most severe first.)_

## Findings in detail

### F-001 — Privacy Policy names Cloudflare as a data processor; Cloudflare is not in the delivery chain
- **Category:** GDPR
- **Impact:** Medium — Article 13(1)(e)–(f) requires accurate disclosure of the recipients of personal data and of any third-country transfer plus its safeguard. The policy names a processor that never touches the data and omits the ones that do. It does not create a breach, but the privacy notice is the one document a visitor is entitled to rely on.
- **Probability:** High — live now, and wrong on every read.
- **Rating:** **High**
- **Evidence:** `PrivacyPolicy.tsx` describes Cloudflare in five places (lines 36, 43, 54, 61, 81), including "Cloudflare is based in the United States; where it processes data outside the EU/EEA, that transfer is safeguarded by Standard Contractual Clauses under Cloudflare's Data Processing Addendum," and a claim that Cloudflare "enforce[s] HTTPS" and "may set a short-lived, strictly necessary security cookie." Against that: `dig sinaida.eu A` returns `185.199.108–111.153` (GitHub Pages' four anycast IPs), nameservers are `ns.inwx.de` (the registrar, not Cloudflare), and the live response headers are `server: GitHub.com`, `via: 1.1 varnish`, `x-served-by: cache-vie6320-VIE`, `x-fastly-request-id: …` — the IP block resolves to **AS54113, Fastly, Inc.**, which is GitHub Pages' CDN. There is no Cloudflare anywhere in the path.
- **Why it matters:** The policy currently over-discloses (a processor that does not exist, with a transfer safeguard that does not apply) and under-discloses (Fastly and GitHub, which genuinely do process visitor IPs and request metadata in the US). For someone whose credibility rests partly on regulatory and documentation rigor, this is the specific document worth being exact in. The likeliest explanation is that the policy was written against the planned Cloudflare setup recommended in the first audit rather than the deployed one.
- **Recommended remediation:** Two valid paths, and the choice is a hosting decision, not a copy decision. Either **(a)** rewrite the processor section to describe GitHub Pages and its Fastly CDN as the actual processors, with the correct US-transfer safeguard, or **(b)** actually put Cloudflare in front of the domain — which makes the current text true *and* closes F-004 in the same move. Do not fix this by editing the text alone if the intent is still to add Cloudflare.

### F-002 — Every route declares the homepage as its canonical URL
- **Category:** SEO
- **Impact:** Medium — a `rel=canonical` pointing elsewhere is a direct instruction to search engines to consolidate the page into the target and drop it from the index. The two work case pages are the strongest evidence of capability on the entire site, and they are the pages a booker most plausibly lands on from a shared link.
- **Probability:** High — served on every route, on every request, right now.
- **Rating:** **High**
- **Evidence:** `curl -s https://sinaida.eu/work/redkie-ptitsy/` returns `<link rel="canonical" href="https://sinaida.eu/">`, the homepage `<title>`, and the homepage `og:title` / `og:image`. Because the site is a React SPA served from a single `index.html`, these tags are identical on `/privacy/`, `/collaborate/`, `/work/redkie-ptitsy/` and `/work/the-eyes-chico/`. Only `document.title` and the meta description are patched client-side (`WorkCase.tsx:22-23`, `Collaborate.tsx:55`); canonical and Open Graph tags are never touched. Meanwhile `sitemap.xml` lists all five URLs as indexable at priority 0.8–0.9, which contradicts the canonical directive on the pages themselves.
- **Why it matters:** Two consequences, both invisible from inside the site. Search engines are told the case studies are duplicates of the homepage. And every share of a case-study link on LinkedIn, Instagram, Slack or Telegram renders the generic homepage card instead of the project's own title and image — so the project pages are simultaneously hardest to find and least compelling when shared.
- **Recommended remediation:** Set canonical and the Open Graph/Twitter tags per route alongside the title and description that are already being set (the `usePageMeta` hook in `WorkCase.tsx` is already the right place). This fixes social previews immediately. Search-engine indexing additionally benefits from prerendering the routes to static HTML at build time, which is a larger change worth deciding separately.

### F-003 — 3.26 MB portrait served to render a 258 px avatar
- **Category:** Performance
- **Impact:** Medium — a single image is roughly half the page's total transferred weight, for an element rendered at about 1.5% of its intrinsic pixel area.
- **Probability:** High — every visitor, every device, every visit.
- **Rating:** **High**
- **Evidence:** `/sinaida-photo.jpg` is `content-length: 3,263,001` bytes, intrinsic dimensions 2000×2000, rendered at 258×258 CSS pixels (measured in-browser in the About section). No `srcset`, no `width`/`height` attributes, `loading` unset (so eager, not lazy), and JPEG only — no WebP or AVIF. For comparison, the entire JavaScript bundle including three.js is 365 KB gzipped.
- **Why it matters:** On a typical mobile connection this is roughly 15–20 seconds of transfer for a thumbnail, and because it loads eagerly it competes for bandwidth with the resources that actually determine perceived load speed. The site's own lite mode carefully avoids shipping a WebGL scene to low-capability devices, then ships those same devices a 3.26 MB photograph regardless of mode.
- **Recommended remediation:** Export at roughly 2× the rendered size (about 520×520), serve WebP with a JPEG fallback, add explicit `width`/`height` (which also removes the layout shift), and set `loading="lazy"` since it sits below the fold. Expect the file to land in the 30–60 KB range — a reduction of about 98%. The same treatment applies to the four work images in `src/assets/` (250–300 KB each), though those are already code-split and less urgent.

### F-004 — No HTTP security headers (carried forward from the first audit, unremediated)
- **Category:** Security
- **Impact:** High — no `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, or `Permissions-Policy`. There is no defense-in-depth against clickjacking or MIME-sniffing, and no constraint at all on any script the page might ever load.
- **Probability:** Medium — nothing is exploitable today (static site, no backend, no user input, no third-party scripts), but the exposure is structural and applies the moment anything is added.
- **Rating:** **High**
- **Evidence:** `curl -I https://sinaida.eu` returns none of the above; `server: GitHub.com` confirms requests reach GitHub Pages directly. HTTPS itself is fine — `http://` 301-redirects to `https://`, and the certificate is valid. This is a GitHub Pages platform limitation, not a repo oversight: custom response headers are not supported on custom domains.
- **Why it matters:** This is the one finding that cannot be fixed by editing the repo. It requires an infrastructure decision, and it is the same decision as option (b) in F-001 — putting Cloudflare in front of the domain resolves both findings at once.
- **Recommended remediation:** Move DNS to Cloudflare's free tier with the proxy enabled, then add the headers via a Transform Rule. No change to the deploy pipeline. If Cloudflare is declined, F-001 must be fixed by correcting the policy text instead, and this finding stays open as an accepted risk.

### F-005 — All three consent buttons produce identical behavior
- **Category:** GDPR
- **Impact:** Medium — the banner presents Accept All, Essential Only and Decline All as three distinct choices, and nothing in the codebase behaves differently depending on which is pressed.
- **Probability:** Medium — only becomes material if the choice is ever relied upon, or if a visitor notices the control is inert.
- **Rating:** **Medium**
- **Evidence:** `grep -rn "cookie-consent" src/` returns matches only inside `CookieBanner.tsx` (the read at line 13, the write at line 20). No other module reads the stored value or branches on it. All three handlers call the same `recordConsent()` and dismiss the banner.
- **Why it matters:** The legal exposure is genuinely low, because nothing non-essential loads in the first place — the site sets no analytics, no advertising, no third-party anything. But that is exactly the point: since there is nothing to decline, "Decline All" is a control that implies an effect it does not have. Under EDPB guidance consent must be specific and acted upon, and a consent surface that does not act on the choice is the kind of detail that reads as compliance theater to precisely the audience that would check.
- **Recommended remediation:** The honest fix is to shrink the banner to match reality. Since the only storage used is the consent record itself plus the render-mode preference — both strictly necessary — a single dismissible notice ("this site stores one preference locally and uses no analytics or trackers, [privacy policy]") is more accurate and more defensible than a three-button consent dialog. Keep the three-button banner only if analytics is genuinely planned, in which case wire the choice to actually gate it.

### F-006 — Rights section lists four of the eight GDPR data-subject rights
- **Category:** GDPR
- **Impact:** Medium — the "What are your data protection rights?" section is presented as a complete enumeration and is missing half of it.
- **Probability:** Medium — matters to a visitor who reads the policy in order to exercise a right, which is the population most likely to read it at all.
- **Rating:** **Medium**
- **Evidence:** `PrivacyPolicy.tsx:74-77` lists access, rectification, erasure, and restriction. Not listed: **data portability** (Art. 20), **the right to object** (Art. 21), and **the right to withdraw consent at any time** (Art. 7(3)). The right to lodge a complaint (Art. 77) is functionally covered by the ÚOOÚ contact section but is never framed as a right. Also absent: the one-month response deadline and free-first-copy rule (Art. 12(3), 15(3)), and any statement about automated decision-making or profiling (Art. 22) — which for this site is a plain "none is used," but the checklist asks for that to be stated rather than omitted.
- **Why it matters:** A partial rights list is a common template artifact, and it is the section a supervisory authority looks at first in any complaint.
- **Recommended remediation:** Complete the list to all eight rights, add the one-month/free-first-copy sentence, and add a one-line statement that the site performs no automated decision-making or profiling.

### F-007 — No way to withdraw or change consent after the banner is dismissed
- **Category:** GDPR
- **Impact:** Medium — Article 7(3) requires that withdrawing consent be as easy as giving it. Once the banner is answered, the only way to revisit the choice is clearing browser storage manually.
- **Probability:** Medium — every returning visitor is in this state, though few will want to act on it given how little is stored.
- **Rating:** **Medium**
- **Evidence:** `CookieBanner.tsx:12-17` renders the banner only when `localStorage` has no `cookie-consent` entry, and never re-renders it afterwards. `Footer.tsx` links to `/privacy` and `/collaborate`; there is no cookie-settings control anywhere on the site.
- **Why it matters:** Cheap to fix, and it is the standard pairing for any consent banner.
- **Recommended remediation:** Add a "Cookie settings" link in the footer that clears the stored record and re-opens the banner. Note this finding dissolves entirely if F-005 is resolved by replacing the banner with a plain notice — resolve F-005 first, then decide.

### F-008 — Privacy Policy contains stale claims
- **Category:** Content / GDPR
- **Impact:** Low — neither claim misstates a right; both describe things the site does not do.
- **Probability:** Medium — visible to anyone reading the policy through.
- **Rating:** **Low**
- **Evidence:** `PrivacyPolicy.tsx:69` — the Marketing section says "I would like to send you information about my latest projects or exhibition openings" and refers to opting out, but there is no mailing list, signup, or marketing mechanism on the site. `PrivacyPolicy.tsx:96` — "some of my website features (such as custom fonts…) may not function" if cookies are blocked, which was written when fonts came from Google's CDN; VT323 is now self-hosted and has nothing to do with cookies.
- **Why it matters:** Small, but these are the sentences that make a policy read as a copied template rather than a description of this specific site.
- **Recommended remediation:** Remove both, or rewrite Marketing to say plainly that no marketing communications are sent and no mailing list exists.

### F-009 — Cookie banner's Privacy Policy link fails AA text contrast
- **Category:** Accessibility (WCAG 1.4.3, Level AA)
- **Impact:** Low — the link is underlined, so it is still identifiable without relying on color, and the policy is also reachable from the footer.
- **Probability:** High — rendered to every first-time visitor.
- **Rating:** **Medium**
- **Evidence:** Computed in-browser across every rendered text node: the `Privacy Policy` link inside the banner renders `#BF0D25` on `#0E0E11` at 16 px regular weight — **3.03:1**, against the 4.5:1 required for normal-size text. The same red at 32–96 px in section headings measures 3.18:1, which passes the 3:1 large-text threshold, so this is confined to small text. No other text on the homepage fails; the `#FF3333` used on the Contact button measures about 5.4:1 and passes.
- **Why it matters:** It is the single small-size use of the darker red, and it happens to be on the one link in the site's compliance UI.
- **Recommended remediation:** Use the brighter `#FF3333` (already in the palette, already passing) for this link rather than `#BF0D25`. One token change, no design impact.

### F-010 — Mobile menu button clipped at 320 px
- **Category:** Accessibility (WCAG 1.4.10 Reflow, Level AA)
- **Impact:** Medium — the primary navigation control on mobile is partly cut off at the narrowest viewport the criterion specifies.
- **Probability:** Low — 320 px devices are a small and shrinking share of traffic, and the button remains tappable because roughly half of it is still on screen.
- **Rating:** **Low**
- **Evidence:** At a 320 px viewport the hamburger button's bounding box runs from x=301 to x=337, i.e. 17 px past the viewport edge; `documentElement.scrollWidth` stays at 320 because the overflow is clipped rather than scrollable, so the cut is silent. Visually confirmed: the button's red border box is missing its right edge. The header inner is `container mx-auto px-6 … justify-between` (`Header.tsx:88`) with a non-shrinking logo group. At 375 px everything fits with margin to spare.
- **Why it matters:** Reflow is tested at 320 px by definition, so this is a genuine AA failure — but a narrow one, affecting a small slice of real traffic.
- **Recommended remediation:** Reduce the header's horizontal padding or let the ECG logo canvas shrink below the `sm` breakpoint.

### F-011 — OG image is the wrong aspect ratio and 964 KB
- **Category:** SEO / social
- **Impact:** Low — link previews render, they just render cropped and slowly.
- **Probability:** Medium — applies to every share on every platform.
- **Rating:** **Low**
- **Evidence:** `/og-skills.png` is 1232×928 (1.33:1) and 963,833 bytes. `twitter:card` is `summary_large_image`, which along with LinkedIn, Slack and Facebook expects roughly 1.91:1 (1200×630). At 1.33:1 the platforms center-crop, discarding roughly 30% of the image.
- **Why it matters:** The link preview is often the only thing a prospective collaborator sees before deciding whether to click. Worth fixing together with F-002, since both concern how the site presents itself when shared.
- **Recommended remediation:** Re-export at 1200×630 and as JPEG or WebP; expect roughly 100–150 KB.

## What's already working
- **Every fix from this morning's pass is verified live and correct.** VT323 is self-hosted and preloaded, and the resource log shows **exactly one host — `sinaida.eu`**. No third-party request of any kind fires, before or after consent. That is a stronger privacy posture than the overwhelming majority of sites this checklist gets run against.
- **Heading structure is now clean end to end**: a single `h1`, then `h2` per section, then `h3` per item, with no skipped levels anywhere on the homepage. The skip link is the first focusable element and its `#main-content` target exists on every page.
- **Focus is visible and passes contrast.** Keyboard focus renders a 1.5 px `#FF3333` outline measuring about 5.4:1 against the background — comfortably above the 3:1 required for non-text indicators. Tab order follows visual order.
- **Reflow is otherwise solid**: at 320 px the document does not scroll horizontally and text does not overflow. F-010 is a single clipped control, not a broken layout.
- **The lite/full render mode is genuinely well engineered** (`useRenderMode.tsx`): it respects `prefers-reduced-motion` first, then Save-Data, then `effectiveType`, then device memory and core count, then WebGL availability, defaulting conservatively to lite and persisting a manual override. Reduced motion is additionally enforced globally in CSS. This is above the bar the adaptive-performance reference asks for.
- **404 handling remains correct**: unknown paths return a real HTTP 404, not a soft 200, and render a styled on-brand error page.
- **The custom cursor degrades correctly** — `body:not(.has-custom-cursor) .cursor-none { cursor: inherit }` (`index.css:166`) means lite-mode visitors keep a normal system cursor instead of losing the pointer entirely. That is the failure mode this pattern usually ships with, and it was anticipated.
- **The `<noscript>` fallback is real content**, not a stub — full services list, work list, capabilities and contact, which is what makes the site legible to non-rendering crawlers and AI agents.
- **No anti-slop tells.** No purple gradients, no icon-in-a-box feature grid, no thick-border cards, no buzzword copy, no bounce easing. The visual language is specific and consistent, and the JavaScript is properly code-split (three.js and the constellation load on demand, 365 KB gzipped total on the homepage).
- **Navigation** is four items, one level, consistently placed, with a working current-location state.

## Recommended next steps
The four **High** findings split cleanly into two decisions rather than four tasks. F-001 and F-004 are the same decision — put Cloudflare in front of the domain and both close together, or decline it and F-001 becomes a policy rewrite while F-004 stays open as accepted risk. F-002 and F-003 are both self-contained code changes with no design implications, and F-003 in particular is close to a free win. The Medium GDPR cluster (F-005, F-006, F-007) is best handled as one pass on the consent surface, and F-005 should be decided first because resolving it dissolves F-007. F-008 through F-011 are backlog.

**This is a diagnosis, not a work order — tell me which findings (by number) you want turned into fixes, and in what order.**
