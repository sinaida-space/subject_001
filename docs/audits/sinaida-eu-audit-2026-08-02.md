# sinaida.eu — Commercial conversion audit

**Prepared for:** Sinaida Krivchenko &nbsp;·&nbsp; **Date:** 2026-08-02 &nbsp;·&nbsp;
**Scope:** live production site, all routes, plus `sinaida-space/subject_001` source.
**Frame:** the site must now convert commercial clients, alongside presenting the practice.

---

## Executive summary

The site is in good technical health and needs no further compliance work. The
2026-07-24 audit closed thirteen findings, and the two that were left "pending DNS"
are now verified closed: the apex serves the full header set from Cloudflare
(`strict-transport-security`, `x-frame-options: DENY`, `x-content-type-options`,
`referrer-policy`, `permissions-policy`), alongside a real per-origin CSP,
a storage notice, a filled privacy policy, a styled 404, `llms.txt`, a sitemap, and
`robots.txt` with Content Signals. Reduced motion is honoured. Nothing here trips the
anti-slop checklist; the visual identity is genuinely distinctive.

**The problem is not the build. It is what the build claims.**

Two findings dominate, and they point in opposite directions from each other:

1. The Services block promises more than the record supports, and contradicts the
   site's own case study while doing it (**F-001, High**).
2. Every service on the site sells real-time TouchDesigner stage work, which is the
   capability with one unpaid credit behind it. Nothing sells interactive web work,
   which has ten deployed pieces behind it and a market that pays this quarter
   (**F-002, High**).

The site is selling the thing that cannot yet be delivered at professional standard,
and hiding the thing that can.

---

## Risk summary

| # | Finding | Category | Impact | Probability | Rating |
|---|---------|----------|--------|-------------|--------|
| F-001 | Services claims exceed the record and contradict the case study | Accuracy / commercial risk | High | High | **High** |
| F-002 | Strongest deliverable is absent from every commercial surface | Conversion | High | High | **High** |
| F-003 | No availability, engagement size, or rate anywhere | Conversion | Medium | High | **Medium** |
| F-004 | Motion proof is two clicks deep, and absent from the hover card | Conversion | Low | Medium | **Low** |
| F-005 | "CONTACT" duplicated in the header | UX | Low | High | **Low** |
| F-006 | Scramble reveal has no screen-reader-safe text during the animation | Accessibility | Low | Low | **Minimal** |

---

## F-001 — Services claims exceed the record, and contradict the site's own case study

**Category:** Accuracy · commercial risk &nbsp;·&nbsp; **Impact:** High &nbsp;·&nbsp;
**Probability:** High &nbsp;·&nbsp; **Rating: High**

**Evidence.** `src/data/services.ts`, rendered on both the homepage and `/collaborate/`:

- Service `venues`: *"Immersive installations and generative visual identities,
  adapted to a space and designed to run unattended, day after day."*
  Record line: *"Installed for The Eyes Chico."*
  The case study for that same piece, `src/data/projects.ts`, says the opposite:
  *"As an installation it is a proposal… Prototyped in Prague, 2026."*
- Service `theater`: *"Responsive scenography… developed with the creative team from
  first concept onward."* Record line: *"Built for Aether Currents and The Eyes Chico."*
  Aether Currents is a browser instrument; The Eyes Chico is a web piece from a
  painting. Neither was a theatre or dance production, and neither involved a
  production creative team.

**Why it matters.** Three separate costs.

First, commercial exposure. "Designed to run unattended, day after day" is a specific
technical promise about stability under an unattended multi-week run. That is
precisely the capability she has identified as beyond her current TouchDesigner level.
A venue that books on this line books a failure.

Second, it breaks her own locked rule. `~/dev/outreach/STRATEGY.md` states the
positioning as narrow, provable and ownable, with every clause a statement of record,
and names the anti-claim explicitly. The Services block is the one part of the site
that does not follow it.

Third, and least visible: unprovable claims are the fuel of the imposter voice.
A page making claims she privately knows are thin makes the act of sending harder,
which is the actual bottleneck in the whole pipeline.

**Remediation.** Rewrite the three service descriptions to the evidence that exists.
"Installed" becomes "prototyped." The theatre and dance service either cites Redkie
Ptitsy honestly as concert work, or states the capability as an offer rather than a
record. The record lines should say what each piece actually was. This makes the page
shorter and considerably more convincing: a specific true credit outsells three
vague ones.

---

## F-002 — The strongest deliverable is absent from every commercial surface

**Category:** Conversion &nbsp;·&nbsp; **Impact:** High &nbsp;·&nbsp;
**Probability:** High &nbsp;·&nbsp; **Rating: High**

**Evidence.** All three services in `services.ts` are addressed to festivals, concerts,
theatre, dance, venues and institutions, and all describe real-time stage systems.
The homepage services heading reads "Digital tools for human connection." Nowhere on
the site can a visitor commission a website, a WebGL component, or an interactive web
experience.

Meanwhile the site itself presents ten deployed interactive web pieces, and the
underlying repositories show sustained delivery: Aether Currents at 97 commits, the
site itself at 636.

**Why it matters.** The stage-visuals market requires a reputation she is still
building and pays on a 6–18 month commissioning cycle. The interactive web market
requires a portfolio she already has and pays in weeks. The site currently makes the
first one findable and the second one invisible, which inverts the commercial reality.

**Remediation.** Add a fourth service for interactive web, positioned on the claim the
portfolio actually proves: sites that move, react, and use the camera. Three engagement
sizes (single interactive page, full site, or the interaction component alone for teams
that already have a developer). Full copy drafted in `~/dev/outreach/OFFER-web.md`.

---

## F-003 — No availability, engagement size, or rate anywhere on the site

**Category:** Conversion &nbsp;·&nbsp; **Impact:** Medium &nbsp;·&nbsp;
**Probability:** High &nbsp;·&nbsp; **Rating: Medium**

**Evidence.** The only availability statement on the homepage is
*"AVAILABLE: Projects between engineering and emotion."* `/collaborate/` states
*"Lead time: Depends on set length and scope, confirmed once the brief is in."*
There is no indication of whether she is currently free, what the smallest engagement
is, whether remote work is taken, or any price anchor at any level.

**Why it matters.** A commercial buyer with a budget and a date cannot self-qualify.
The standard behaviour when a site gives no price signal is to assume the answer is
either "unaffordable" or "not a real business," and to leave without asking. The
poetic availability line reads well to a curator and tells a client nothing.

**Remediation.** A plain availability line with a real state ("Taking commissions from
October 2026. Remote work year-round."). A stated minimum engagement. A price anchor
of some kind, even a "from" figure per package. Figures are hers to set; the page
should have somewhere for them to go.

---

## F-004 — Motion proof is two clicks deep, and absent from the hover card

**Category:** Conversion &nbsp;·&nbsp; **Impact:** Low &nbsp;·&nbsp;
**Probability:** Medium &nbsp;·&nbsp; **Rating: Low**

*Rated Medium on first pass and corrected down after checking the data. The original
claim, that the work cannot be understood without visiting the live deployment, was
wrong.*

**Evidence.** Every project except `mahler` carries a YouTube id in `projects.ts`
(`redkie-ptitsy`, `the-eyes-chico`, `submerged`, `aether-currents`, `ethereal-path`,
`stereolove`), and `ProjectDetail` renders `VideoEmbed` for any project that has one,
behind a self-hosted poster. So a visitor who opens a project does get motion, without
leaving the site and without granting camera access.

The residual gap is smaller and specific: reaching that video takes two interactions
(open the star, press play), and `GraphHoverCard` — the surface a visitor sees while
deciding whether to open anything — shows only a dithered still.

**Why it matters.** One removable click on the path to the only asset that explains a
real-time piece. Worth something, worth much less than the two High findings above it.

**Options, in order of cost.** Nothing here is urgent.
1. Leave it. The click-gated facade is a deliberate privacy design and it works.
2. Add a short silent loop to the hover card only: `muted`, `playsinline`,
   `preload="none"`, poster-first, suppressed under `prefers-reduced-motion` and in
   lite mode. Needs a ~10 s clip per piece, which does not currently exist.
3. Give `mahler` a video, or accept that it is a repository and does not need one.

Separately, and unrelated to this finding: those short clips are worth producing anyway,
because festival applications, an MA portfolio and any Global Talent file all need them.
That is an argument for making the clips, not for changing the site.

---

## F-005 — "CONTACT" appears twice in the header

**Category:** UX &nbsp;·&nbsp; **Impact:** Low &nbsp;·&nbsp; **Probability:** High
&nbsp;·&nbsp; **Rating: Low**

The primary navigation lists WORK, ABOUT, SERVICES, CONTACT, and a bordered CONTACT
button sits immediately to its right. Two controls, same label, same destination.
NN/g's consistency heuristic: duplicated labels make a visitor pause to work out
whether they differ. Drop one, or change the button to a distinct action.

---

## F-006 — Scramble reveal exposes noise to assistive technology

**Category:** Accessibility &nbsp;·&nbsp; **Impact:** Low &nbsp;·&nbsp;
**Probability:** Low &nbsp;·&nbsp; **Rating: Minimal**

`useScrambleReveal` writes scrambled characters into the DOM for up to 720 ms before
resolving. Text extraction one second after load returned the About credentials as
noise (`B░ome▓i\al \ngi▓eer/n▒, ▓S▓., B▒▒man…`). The hook correctly resolves once, is
disabled under reduced motion and lite mode, and the resting DOM holds real text, so
real impact is small. Adding a visually hidden copy of the true string, with the
animated element marked `aria-hidden`, closes it completely.

---

## What is already working

Worth stating plainly, because it is unusual.

- **Security and privacy are done properly.** Full header set now live on the apex,
  a real per-origin CSP with a single deliberate YouTube frame exception, self-hosted
  video posters so Google is contacted only after a click, an honest one-button
  storage notice, and a privacy policy that names actual processors.
- **The 24 July remediation held.** F-004 and F-013 from that audit are verified closed.
- **Reduced motion is respected throughout**, including a lite render mode, which is
  rare on a site this visually heavy.
- **No anti-slop hits.** The identity is specific and authored. Nothing about it reads
  as generated.
- **`/collaborate/` is a genuinely good page** in structure: services, process,
  practicalities, press kit, boilerplate written for copy-paste, contact. The problem
  is the accuracy of two claims inside it, not the page.
- **The work itself is coherent.** Every piece uses the viewer's body as the input and
  treats the screen as a window rather than a surface. That through-line is a real
  position and the site does not yet say it out loud.

---

## Sequencing

F-001 first, because it is the only finding that carries risk rather than lost
opportunity. F-002 next, since it is the one that makes the sellable thing visible.
F-003 needs decisions from her before anything can be written. F-005 and F-006 are ten
minutes each. F-004 is optional and can wait for the clips to exist.

---

## Remediation record — 2026-08-02, branch `fix/audit-2026-08-02`

| # | Status |
|---|--------|
| F-001 | **Fixed** — `services.ts` rewritten. "Installed for The Eyes Chico" is now "Prototyped at wall scale… Prague 2026", matching the case study. "Designed to run unattended, day after day" removed. The theatre and dance record now states the body-tracking systems are her own public work and that first stage commissions are open, instead of implying past productions. Redkie Ptitsy gained its real detail (nine projections, one per song, March 2026). A file-level comment states the rule so it does not drift back. |
| F-002 | **Fixed** — fourth service `web` added, placed second so it reads before the two speculative ones. Claim is "sites and components that move, react, and watch", evidenced by the site's own pieces. |
| F-003 | **Closed, declined 2026-08-02.** She has decided not to publish availability, a minimum engagement, or a price anchor. The finding is accurate and the trade-off is accepted deliberately: buyers cannot self-qualify, and some will leave without asking. Recorded here so it is a decision on the record rather than an oversight, and so it is not re-raised as a new finding at the next audit. |
| F-004 | **Open by choice** — downgraded to Low, see above. |
| F-005 | **Fixed** — desktop nav now filters out `Contact`, matching what the mobile menu already did. One CONTACT control instead of two. |
| F-006 | **Fixed** — `sr-only` copies of the true eyebrow and headline strings added to `HeroSection`, with every animated layer marked `aria-hidden`. Assistive tech now gets the real `<h1>` text immediately instead of up to 860 ms of noise. |
