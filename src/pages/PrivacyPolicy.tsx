import { usePageMeta } from '@/hooks/usePageMeta';

const PrivacyPolicy = () => {
  usePageMeta({
    title: 'Privacy Policy — Sinaida Krivchenko',
    description: 'How this website handles personal data, what it stores, and the rights visitors have under GDPR.',
    canonical: 'https://sinaida.eu/privacy/',
  });

  return (
    <div id="main-content" tabIndex={-1} className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <a href="/" className="clinical-label text-primary-legible hover:text-accent transition-colors mb-8 inline-block">
          ← Back
        </a>

        <h1 className="font-display text-4xl font-light mb-8">Privacy Policy</h1>

        <div className="prose prose-invert font-clinical text-sm text-secondary-foreground space-y-6 leading-relaxed">
          <p>Sinaida Krivchenko ("I", "me", or "the Website") is committed to protecting your personal data. This privacy policy will explain how I use the personal data collected from you when you use this website.</p>

          <h2 className="font-display text-lg text-foreground mt-8">Topics</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>What data do I collect?</li>
            <li>How do I collect your data?</li>
            <li>How will I use your data?</li>
            <li>How do I store your data?</li>
            <li>Third-party service providers</li>
            <li>Analytics</li>
            <li>Embedded video</li>
            <li>Marketing</li>
            <li>What are your data protection rights?</li>
            <li>Automated decision-making and profiling</li>
            <li>Cookies</li>
            <li>How do I use cookies?</li>
            <li>What types of cookies do I use?</li>
            <li>How to manage cookies</li>
            <li>Privacy policies of other websites</li>
            <li>Changes to my privacy policy</li>
            <li>How to contact me</li>
            <li>How to contact the appropriate authority</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">What data do I collect?</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Personal identification information (Name, email address, etc.) should you choose to reach out via the email link on this website or external links.</li>
            <li>Basic technical data processed on my behalf by the infrastructure providers that deliver this website, Cloudflare (the reverse proxy and CDN in front of the site), GitHub Pages (hosting), and Fastly (the content delivery network GitHub Pages serves through): IP address, browser type, device/request metadata, and approximate location derived from IP address.</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">How do I collect your data?</h2>
          <p className="text-muted-foreground">You directly provide most of the data I collect. I collect and process data when you:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Voluntarily reach out via the email link on this website.</li>
            <li>Use or view my website, where basic technical signals are automatically processed by Cloudflare, GitHub Pages, and Fastly as part of serving the page to you.</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">How will I use your data?</h2>
          <p className="text-muted-foreground">I collect your data so that I can:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Respond to your inquiries regarding collaborations, AI visuals, or interactive systems.</li>
            <li>Improve website functionality and user experience.</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">How do I store your data?</h2>
          <p className="text-muted-foreground">Your data is securely stored on encrypted servers provided by GitHub Pages, my website hosting provider. I will keep your personal identification data for as long as is necessary for the purposes set out in this privacy policy, or until you request its deletion. Technical request logs held by Cloudflare, GitHub Pages, and Fastly are retained only for the short period those providers need for security and reliability purposes, per their own retention schedules. I do not extend or separately store these logs myself.</p>

          <h2 className="font-display text-lg text-foreground mt-8">Third-party service providers</h2>
          <p className="text-muted-foreground">
            This website is delivered to you through three infrastructure providers acting as processors on my behalf. Cloudflare sits in front of the website, GitHub Pages hosts it, and Fastly is the content delivery network GitHub Pages serves through. Cloudflare also produces the aggregate analytics described in the next section:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><span className="text-foreground">Cloudflare, Inc.</span>: sits in front of this website as a reverse proxy and CDN. It provides content delivery, TLS/HTTPS termination, and protection against denial-of-service attacks and automated abuse. It processes your IP address, browser and device metadata (user agent), the URL requested, timestamps, and your approximate country derived from IP address. It also produces the aggregate analytics described in the Analytics section below, and it runs Network Error Logging, which reports failed connection attempts back to Cloudflare so delivery problems can be detected. Cloudflare, Inc. is based in the United States. Where it processes data outside the EU/EEA, that transfer relies on the safeguards set out in Cloudflare's own Data Processing Addendum, which incorporates the EU Standard Contractual Clauses. Legal basis: legitimate interest in delivering the website securely and reliably, and in understanding in aggregate how it is used.</li>
            <li><span className="text-foreground">GitHub, Inc. (a Microsoft company)</span>: operates GitHub Pages, which hosts and serves this website's files, sitting behind Cloudflare in the delivery chain. As an inherent part of delivering the page, it processes your IP address, browser and device metadata, and request logs. GitHub is based in the United States. I use GitHub's free Pages product as it stands; I have not signed a bespoke data processing agreement with GitHub. Where GitHub processes data outside the EU/EEA, that transfer relies on the safeguards set out in GitHub's own Data Protection Agreement, which incorporates the EU Standard Contractual Clauses. Legal basis: legitimate interest, necessary to deliver the website.</li>
            <li><span className="text-foreground">Fastly, Inc.</span>: is the content delivery network GitHub Pages serves this website through, behind Cloudflare. It processes the same categories of technical data, IP address, browser and device metadata, and request logs, for the purpose of delivery and caching. Fastly is based in the United States and acts as GitHub's subprocessor; it is not my direct contractual counterparty. Where Fastly processes data outside the EU/EEA, that transfer relies on the safeguards set out in Fastly's own Data Processing Addendum, which incorporates the EU Standard Contractual Clauses. Legal basis: legitimate interest, necessary to deliver the website.</li>
          </ul>
          <p className="text-muted-foreground">
            None of these three providers is used to build an advertising profile of you. Their data is not sold or shared onward, and I don't receive or store their raw request logs myself.
          </p>

          <h2 className="font-display text-lg text-foreground mt-8">Analytics</h2>
          <p className="text-muted-foreground">
            Cloudflare's analytics is enabled for this website. Because every request already passes through Cloudflare on its way to me, Cloudflare counts those requests as it serves them and reports aggregate figures back to me: how many visits the site received, which pages were viewed, which countries visitors came from, which browsers and device types they used, which sites referred them here, and how quickly pages were delivered.
          </p>
          <p className="text-muted-foreground">
            This measurement happens entirely on Cloudflare's servers, from the request data described above. No script for it runs in your browser, it sets no cookies, and it stores nothing on your device. It does not follow you across other websites, does not build a profile of you, and does not attempt to identify you individually.
          </p>
          <p className="text-muted-foreground">
            Legal basis: legitimate interest in understanding in aggregate how the site is used, so I can improve it. This analytics is cookieless and does not identify individuals, so it falls outside the ePrivacy rules that require consent for storing or accessing information on your device, and I can rely on legitimate interest here.
          </p>
          <p className="text-muted-foreground">
            I weighed that interest against your privacy before turning this on. The measure counts visits in aggregate, keeps nothing on your device, and produces figures that cannot be traced back to a person, so the effect on you is minimal while it still tells me whether the work reaches anyone. If you disagree with that judgement in your own case, exercise your right to object and I will stop processing your data for this purpose.
          </p>
          <p className="text-muted-foreground">
            If you object to this processing, you can tell me using the contact details further down; see the right to object entry under "What are your data protection rights?" below.
          </p>

          <h2 className="font-display text-lg text-foreground mt-8">Embedded video</h2>
          <p className="text-muted-foreground">
            Some project pages include videos hosted on YouTube. Until you press play, nothing is requested from YouTube or Google: the still image you see is served from this website. When you press play, the YouTube player loads directly from Google, which at that point receives your IP address and can set its own cookies. That happens only on your action, and Google's privacy policy governs what it does with the data. If you would rather not load it, don't press play; the written case study stands on its own.
          </p>

          <h2 className="font-display text-lg text-foreground mt-8">Marketing</h2>
          <p className="text-muted-foreground">I don't send marketing communications and I don't operate a mailing list. If you email me, I reply to you about your enquiry and nothing else.</p>

          <h2 className="font-display text-lg text-foreground mt-8">What are your data protection rights?</h2>
          <p className="text-muted-foreground">Under GDPR (General Data Protection Regulation), you are entitled to the following:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>The right to access – You have the right to request copies of your personal data.</li>
            <li>The right to rectification – You have the right to request that I correct any information you believe is inaccurate.</li>
            <li>The right to erasure – You have the right to request that I erase your personal data, under certain conditions.</li>
            <li>The right to restrict processing – You have the right to request that I restrict the processing of your personal data.</li>
            <li>The right to data portability – You have the right to receive your personal data in a structured, commonly used, machine-readable format, and to have it transmitted to another controller.</li>
            <li>The right to object – You have the right to object to processing of your personal data that is carried out on the basis of legitimate interest.</li>
            <li>The right to withdraw consent – Where I process your data based on your consent, you can withdraw that consent at any time, and withdrawing is as easy as giving it. Withdrawing consent does not affect the lawfulness of processing carried out before the withdrawal.</li>
            <li>The right to lodge a complaint – You have the right to lodge a complaint with a supervisory authority. See "How to contact the appropriate authority" below.</li>
          </ul>
          <p className="text-muted-foreground">I answer requests within one month of receipt. The first copy of your personal data is provided free of charge.</p>

          <h2 className="font-display text-lg text-foreground mt-8">Automated decision-making and profiling</h2>
          <p className="text-muted-foreground">This website does not carry out automated decision-making or profiling that produces legal effects concerning you or similarly significantly affects you.</p>

          <h2 className="font-display text-lg text-foreground mt-8">Cookies</h2>
          <p className="text-muted-foreground">This website sets no cookies at all. I use browser local storage for exactly two preferences: whether you have acknowledged the storage notice, and whether you have chosen the lite or full render mode of the site. Both are strictly necessary for the website to function, and neither is transmitted anywhere. Cloudflare's security layer may, in rare cases, set a short-lived cookie when it needs to verify that a request is not automated. This happens only when Cloudflare detects unusual traffic on the site, it is strictly necessary for security, and it is exempt from the requirement for consent. It is not used for tracking.</p>

          <h2 className="font-display text-lg text-foreground mt-8">How do I use cookies?</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Remembering whether you have accepted, declined, or limited the cookie notice.</li>
            <li>Keeping interactive website elements functional during your session.</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">What types of cookies do I use?</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Functionality – I use local browser storage to remember your selected preferences.</li>
            <li>Security – Cloudflare may occasionally set a short-lived cookie to verify that a request is not automated, described under Cookies above.</li>
            <li>Analytics – Cloudflare's analytics is cookieless and sets no cookie, described under Analytics above.</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">How to manage cookies</h2>
          <p className="text-muted-foreground">Because this website sets no cookies, blocking cookies in your browser changes nothing. If you block local storage instead, the storage notice will reappear on each visit and your chosen render mode will not be remembered.</p>

          <h2 className="font-display text-lg text-foreground mt-8">Privacy policies of other websites</h2>
          <p className="text-muted-foreground">The Website contains links to other websites (such as Instagram or LinkedIn). My privacy policy applies only to my website, so if you click on a link to another website, you should read their privacy policy.</p>

          <h2 className="font-display text-lg text-foreground mt-8">Changes to my privacy policy</h2>
          <p className="text-muted-foreground">I keep my privacy policy under regular review and place any updates on this web page. This privacy policy was last updated on July 24, 2026.</p>

          <h2 className="font-display text-lg text-foreground mt-8">How to contact me</h2>
          <p className="text-muted-foreground">
            If you have any questions about this privacy policy, the data I hold on you, or you would like to exercise one of your data protection rights, please do not hesitate to contact me.
          </p>
          <p className="text-muted-foreground">
            Name: Sinaida Krivchenko<br />
            Location: Prague, Czechia<br />
            Email: gallant_mod5v@icloud.com
          </p>

          <h2 className="font-display text-lg text-foreground mt-8">How to contact the appropriate authority</h2>
          <p className="text-muted-foreground">
            Should you wish to report a complaint or if you feel that I have not addressed your concern in a satisfactory manner, you may contact the Office for Personal Data Protection (Úřad pro ochranu osobních údajů) in the Czech Republic.
          </p>
          <p className="text-muted-foreground">
            Address: Pplk. Sochora 27, 170 00 Prague 7, Czech Republic<br />
            Email: posta@uoou.cz
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
