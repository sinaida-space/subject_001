import { lazy, Suspense } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useRenderMode } from '@/hooks/useRenderMode';
import ObfuscatedMailto from '@/components/ObfuscatedMailto';
import Header from '@/components/Header';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import { BackLink, H1_CLASS, KICKER_CLASS, PAGE_MAIN_CLASS, TextSection } from '@/components/PageParts';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const PrivacyPolicy = () => {
  usePageMeta({
    title: 'Privacy Policy | Sinaida Krivchenko',
    description: 'How this website handles personal data, what it stores, and the rights visitors have under GDPR.',
    canonical: 'https://sinaida.eu/privacy/',
  });

  const { mode } = useRenderMode();

  return (
    <div className="relative min-h-screen bg-background">
      {/* Same starfield as the case study template — dialed down, a subtle
          sense of continuity behind a page that's mostly here to be read. */}
      {mode === 'full' && (
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      )}
      <Header />
      <main id="main-content" tabIndex={-1} className={PAGE_MAIN_CLASS}>
        <BackLink />
        <div className={KICKER_CLASS}>Privacy</div>
        <h1 className={H1_CLASS}>Privacy policy</h1>
        <TextSection title="In short">
          <p>I built this website with the intention to collect as little data as&nbsp;possible. Some services that deliver it need basic technical data to work. This page explains what they are, what they process, and&nbsp;why.</p>
          <p>In this policy, &ldquo;I&rdquo; and &ldquo;me&rdquo; mean Sinaida Krivchenko, who runs this&nbsp;website.</p>
          <ul className="space-y-2">
            <li><a href="#data" className="text-primary-legible underline underline-offset-4 transition-opacity hover:opacity-70">Data</a>: What I collect, how, and how I use it</li>
            <li><a href="#storage" className="text-primary-legible underline underline-offset-4 transition-opacity hover:opacity-70">Storage</a>: Where it lives and who provides the service</li>
            <li><a href="#analytics" className="text-primary-legible underline underline-offset-4 transition-opacity hover:opacity-70">Analytics</a>: Aggregate visit statistics, no tracking cookies</li>
            <li><a href="#video" className="text-primary-legible underline underline-offset-4 transition-opacity hover:opacity-70">Video</a>: Embedded video, and what it sends</li>
            <li><a href="#cookies" className="text-primary-legible underline underline-offset-4 transition-opacity hover:opacity-70">Cookies</a>: Which ones, and how to manage them</li>
            <li><a href="#rights" className="text-primary-legible underline underline-offset-4 transition-opacity hover:opacity-70">Rights</a>: What you can ask for, and how</li>
            <li><a href="#contact-me" className="text-primary-legible underline underline-offset-4 transition-opacity hover:opacity-70">Contact</a>: How to reach me or the authority</li>
          </ul>
        </TextSection>
        <TextSection id="data" title={<>What data do I collect?</>}>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your name and email address, if you write to me through the email link on this website or elsewhere.</li>
            <li>Basic technical data processed on my behalf by the infrastructure providers that deliver this website, Cloudflare (the reverse proxy and CDN in front of the site), GitHub Pages (hosting), and Fastly (the content delivery network GitHub Pages serves through): IP address, browser type, device/request metadata, and approximate location derived from IP address.</li>
          </ul>

          
        </TextSection>
        <TextSection title={<>How do I collect your data?</>}>
          <p>You directly provide most of the data I collect. I collect and process data when you:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Voluntarily reach out via the email link on this website.</li>
            <li>Use or view my website, where basic technical signals are automatically processed by Cloudflare, GitHub Pages, and Fastly as part of serving the page to you.</li>
          </ul>

          
        </TextSection>
        <TextSection title={<>How will I use your data?</>}>
          <p>I collect your data so that I can:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Reply to your messages about collaborations and projects.</li>
            <li>See, in aggregate, how the site is used, so I can improve it.</li>
          </ul>

          
        </TextSection>
        <TextSection id="storage" title={<>How do I store your data?</>}>
          <p>The website itself stores no personal data: it has no forms, accounts or database. If you write to me, your message stays in my email for as long as the conversation needs it, or until you ask me to delete it. Technical request logs held by Cloudflare, GitHub Pages, and Fastly are retained only for the short period those providers need for security and reliability purposes, per their own retention schedules. I do not extend or separately store these logs myself.</p>

          
        </TextSection>
        <TextSection title={<>Third-party service providers</>}>
          <p>
            This website is delivered to you through three infrastructure providers acting as processors on my behalf. Cloudflare sits in front of the website, GitHub Pages hosts it, and Fastly is the content delivery network GitHub Pages serves through. Cloudflare also produces the aggregate analytics described in the next section:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><span className="text-foreground">Cloudflare, Inc.</span>: sits in front of this website as a reverse proxy and CDN. It provides content delivery, TLS/HTTPS termination, and protection against denial-of-service attacks and automated abuse. It processes your IP address, browser and device metadata (user agent), the URL requested, timestamps, and your approximate country derived from IP address. It also produces the aggregate analytics described in the Analytics section below, and it runs Network Error Logging, which reports failed connection attempts back to Cloudflare so delivery problems can be detected. Cloudflare, Inc. is based in the United States. Where it processes data outside the EU/EEA, that transfer relies on the safeguards set out in Cloudflare's own Data Processing Addendum, which incorporates the EU Standard Contractual Clauses. Legal basis: legitimate interest in delivering the website securely and reliably, and in understanding in aggregate how it is used.</li>
            <li><span className="text-foreground">GitHub, Inc. (a Microsoft company)</span>: operates GitHub Pages, which hosts and serves this website's files, sitting behind Cloudflare in the delivery chain. As an inherent part of delivering the page, it processes your IP address, browser and device metadata, and request logs. GitHub is based in the United States. Where GitHub processes data outside the EU/EEA, that transfer relies on the safeguards set out in GitHub's own Data Protection Agreement, which incorporates the EU Standard Contractual Clauses. Legal basis: legitimate interest, necessary to deliver the website.</li>
            <li><span className="text-foreground">Fastly, Inc.</span>: is the content delivery network GitHub Pages serves this website through, behind Cloudflare. It processes the same categories of technical data, IP address, browser and device metadata, and request logs, for the purpose of delivery and caching. Fastly is based in the United States and acts as GitHub's subprocessor; it is not my direct contractual counterparty. Where Fastly processes data outside the EU/EEA, that transfer relies on the safeguards set out in Fastly's own Data Processing Addendum, which incorporates the EU Standard Contractual Clauses. Legal basis: legitimate interest, necessary to deliver the website.</li>
          </ul>
          <p>
            I do not use these providers to build an advertising profile of you, I do not sell or share their data, and I do not receive or store their raw request logs myself. What each provider does on its own side is set out in its own privacy terms.
          </p>
          <p className="text-muted-foreground">
            The &ldquo;book a call&rdquo; link opens Calendly (Calendly, LLC, United States), a separate service with its own privacy policy. Nothing from Calendly loads on this website until you follow that link.
          </p>

          
        </TextSection>
        <TextSection id="analytics" title={<>Analytics</>}>
          <p>
            Cloudflare's analytics is enabled for this website. Because every request already passes through Cloudflare on its way to me, Cloudflare counts those requests as it serves them and reports aggregate figures back to me: how many visits the site received, which pages were viewed, which countries visitors came from, which browsers and device types they used, which sites referred them here, and how quickly pages were delivered.
          </p>
          <p>
            This measurement happens entirely on Cloudflare's servers, from the request data described above. As I have set it up, no script for it runs in your browser, it sets no cookies, and it stores nothing on your device. As Cloudflare describes this service, it does not follow you across other websites, build a profile of you, or attempt to identify you individually.
          </p>
          <p>
            Calls to the MCP server at&nbsp;/mcp are counted the same way. I use only the number of calls per day, to&nbsp;light one star per night in&nbsp;a&nbsp;small sky the server returns to&nbsp;agents. Nothing about who called is&nbsp;used.
          </p>
          <p>
            Legal basis: legitimate interest in understanding in aggregate how the site is used, so I can improve it. This analytics is cookieless and does not identify individuals, so, as I understand the ePrivacy rules, it does not need consent for storing or accessing information on your device, and I rely on legitimate interest here.
          </p>
          <p>
            I weighed that interest against your privacy before turning this on. The measure counts visits in aggregate, keeps nothing on your device, and produces figures that cannot be traced back to a person, so the effect on you is minimal while it still tells me whether the work reaches anyone. If you see it differently, you can object, and I will stop using your data for this purpose.
          </p>
          <p>
            If you object to this processing, you can tell me using the contact details further down; see the right to object entry under "What are your data protection rights?" below.
          </p>

          
        </TextSection>
        <TextSection id="video" title={<>Embedded video</>}>
          <p>
            Some project pages include videos hosted on YouTube. Until you press play, nothing is requested from YouTube or Google: the still image you see is served from this website. When you press play, the YouTube player loads directly from Google, which at that point receives your IP address and can set its own cookies. That happens only on your action, and Google's privacy policy governs what it does with the data. If you would rather not load it, the written case study tells the whole story.
          </p>

          
        </TextSection>
        <TextSection title={<>Marketing</>}>
          <p>I don’t send newsletters or marketing emails. If you write to me, I reply about your message and nothing else.</p>

          
        </TextSection>
        <TextSection id="rights" title={<>What are your data protection rights?</>}>
          <p>Under GDPR (General Data Protection Regulation), you are entitled to the following:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>The right to access – You have the right to request copies of your personal data.</li>
            <li>The right to rectification – You have the right to request that I correct any information you believe is inaccurate.</li>
            <li>The right to erasure – You have the right to request that I erase your personal data, under certain conditions.</li>
            <li>The right to restrict processing – You have the right to request that I restrict the processing of your personal data.</li>
            <li>The right to data portability – You have the right to receive your personal data in a structured, commonly used, machine-readable format, and to have it transmitted to another controller.</li>
            <li>The right to object – You have the right to object to processing of your personal data that is carried out on the basis of legitimate interest.</li>
            <li>The right to withdraw consent – Where I process your data based on your consent, you can withdraw that consent at any time, and withdrawing is as easy as giving it. Withdrawing consent does not affect the lawfulness of processing carried out before the withdrawal.</li>
            <li>The right to lodge a complaint – You have the right to lodge a complaint with a supervisory authority. See "How to contact the appropriate authority" below.</li>
          </ul>
          <p>I answer requests within one month of receipt. The first copy of your personal data is provided free of charge.</p>

          
        </TextSection>
        <TextSection title={<>Automated decision-making and profiling</>}>
          <p>This website does not carry out automated decision-making or profiling that produces legal effects concerning you or similarly significantly affects you.</p>

          
        </TextSection>
        <TextSection id="cookies" title={<>Cookies</>}>
          <p>This website is built to set no cookies of its own. I use browser local storage for two preferences: whether you have acknowledged the storage notice, and whether you have chosen the lite or full render mode of the site. Both are strictly necessary for the website to function, and neither is transmitted anywhere. During a visit, the site also keeps a few technical flags in session storage, such as the animation quality measured for your device. Your browser deletes them when you close the tab, and they are never transmitted either. Cloudflare's security layer may, in rare cases, set a short-lived cookie when it needs to verify that a request is not automated. Cloudflare describes this cookie as strictly necessary for security and not used for tracking, which to my understanding exempts it from the requirement for consent.</p>

          
        </TextSection>
        <TextSection title={<>What does local storage remember?</>}>
          <ul className="list-disc space-y-1 pl-5">
            <li>That you have seen the storage notice and pressed GOT IT.</li>
            <li>Your chosen render mode, lite or full.</li>
          </ul>

          
        </TextSection>
        <TextSection title={<>Cookies and similar technologies</>}>
          <ul className="list-disc space-y-1 pl-5">
            <li>Functionality – I use local browser storage to remember your selected preferences.</li>
            <li>Security – Cloudflare may occasionally set a short-lived cookie to verify that a request is not automated, described under Cookies above.</li>
            <li>Analytics – Cloudflare's analytics is cookieless and sets no cookie, described under Analytics above.</li>
          </ul>

          
        </TextSection>
        <TextSection title={<>How to manage cookies</>}>
          <p>Because this website sets no cookies of its own, blocking cookies should not change how it works for you. If you block local storage instead, the storage notice will reappear on each visit and your chosen render mode will not be remembered.</p>

          
        </TextSection>
        <TextSection title={<>Privacy policies of other websites</>}>
          <p>This website contains links to other websites (such as Instagram or LinkedIn). This policy covers only my website; on another site, that site’s own privacy policy applies.</p>

          
        </TextSection>
        <TextSection title={<>Changes to my privacy policy</>}>
          <p>I keep my privacy policy under regular review and place any updates on this web page. The services that deliver this website can change how they work; when I learn of a change that matters for your data, I update this page. This privacy policy was last updated on October 15, 2026.</p>

          
        </TextSection>
        <TextSection id="contact-me" title={<>How to contact me</>}>
          <p>
            If you have any questions about this privacy policy, the data I hold on you, or you would like to exercise one of your data protection rights, write to me any time.
          </p>
          <p>
            Name: Sinaida Krivchenko<br />
            Location: Prague, Czechia<br />
            Email:{' '}
            <ObfuscatedMailto
              label={'gallant_mod5v [at] icloud [dot] com'}
              className="text-primary-legible underline underline-offset-2 hover:text-accent transition-colors"
            />
          </p>

          
        </TextSection>
        <TextSection title={<>How to contact the appropriate authority</>}>
          <p>
            If you feel I have not handled your concern well, you can also contact the Office for Personal Data Protection (Úřad pro ochranu osobních údajů) in the Czech Republic.
          </p>
          <p>
            Address: Pplk. Sochora 27, 170 00 Prague 7, Czech Republic<br />
            Email: posta@uoou.cz
          </p>
        </TextSection>
      </main>
      <ContactChannel question="A question about your data, or anything else?" />
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
