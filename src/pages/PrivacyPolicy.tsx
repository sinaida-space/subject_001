import { nbsp } from '@/lib/typo';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <a href="/" className="clinical-label text-primary-legible hover:text-primary-legible/70 transition-colors mb-8 inline-block">
          ← Back
        </a>

        <h1 className="font-display text-4xl font-light mb-8">Privacy Policy</h1>

        <div className="prose prose-invert font-clinical text-sm text-secondary-foreground space-y-6 leading-relaxed">
          <p>{nbsp('Zinaida Krivchenko ("I", "me", or "the Website") is committed to protecting your personal data. This privacy policy will explain how I use the personal data collected from you when you use this website.')}</p>

          <h2 className="font-display text-lg text-foreground mt-8">Topics</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>{nbsp('What data do I collect?')}</li>
            <li>{nbsp('How do I collect your data?')}</li>
            <li>{nbsp('How will I use your data?')}</li>
            <li>{nbsp('How do I store your data?')}</li>
            <li>Marketing</li>
            <li>{nbsp('What are your data protection rights?')}</li>
            <li>{nbsp('What are cookies?')}</li>
            <li>{nbsp('How do I use cookies?')}</li>
            <li>{nbsp('What types of cookies do I use?')}</li>
            <li>{nbsp('How to manage your cookies')}</li>
            <li>{nbsp('Privacy policies of other websites')}</li>
            <li>{nbsp('Changes to my privacy policy')}</li>
            <li>{nbsp('How to contact me')}</li>
            <li>{nbsp('How to contact the appropriate authorities')}</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">What data do I collect?</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>{nbsp('Personal identification information (Name, email address, etc.) should you choose to reach out via contact forms or external links.')}</li>
            <li>{nbsp('Basic technical data that may be processed by the website hosting provider, such as IP address, browser type, and request metadata.')}</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">How do I collect your data?</h2>
          <p className="text-muted-foreground">{nbsp('You directly provide most of the data I collect. I collect and process data when you:')}</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>{nbsp('Voluntarily complete a contact form or provide feedback via email or Telegram.')}</li>
            <li>{nbsp('Use or view my website, where basic technical signals may be processed by my hosting provider.')}</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">How will I use your data?</h2>
          <p className="text-muted-foreground">{nbsp('I collect your data so that I can:')}</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>{nbsp('Respond to your inquiries regarding collaborations, AI visuals, or interactive systems.')}</li>
            <li>{nbsp('Improve website functionality and user experience.')}</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">How do I store your data?</h2>
          <p className="text-muted-foreground">{nbsp('Your data is securely stored on encrypted servers provided by my website hosting provider. I will keep your personal identification data for as long as is necessary for the purposes set out in this privacy policy, or until you request its deletion.')}</p>

          <h2 className="font-display text-lg text-foreground mt-8">Marketing</h2>
          <p className="text-muted-foreground">{nbsp('I would like to send you information about my latest projects or exhibition openings that I think you might like. If you have agreed to receive marketing, you may always opt out at a later date.')}</p>

          <h2 className="font-display text-lg text-foreground mt-8">What are your data protection rights?</h2>
          <p className="text-muted-foreground">{nbsp('Under GDPR (General Data Protection Regulation), you are entitled to the following:')}</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>{nbsp('The right to access – You have the right to request copies of your personal data.')}</li>
            <li>{nbsp('The right to rectification – You have the right to request that I correct any information you believe is inaccurate.')}</li>
            <li>{nbsp('The right to erasure – You have the right to request that I erase your personal data, under certain conditions.')}</li>
            <li>{nbsp('The right to restrict processing – You have the right to request that I restrict the processing of your personal data.')}</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">Cookies</h2>
          <p className="text-muted-foreground">{nbsp('Cookies and local storage are browser technologies used to remember preferences or support website functionality. This website does not use analytics cookies.')}</p>

          <h2 className="font-display text-lg text-foreground mt-8">How do I use cookies?</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>{nbsp('Remembering whether you have accepted, declined, or limited the cookie notice.')}</li>
            <li>{nbsp('Keeping interactive website elements functional during your session.')}</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">What types of cookies do I use?</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>{nbsp('Functionality – I use local browser storage to remember your selected preferences.')}</li>
            <li>{nbsp('Analytics – I do not currently use a dedicated analytics service on this website.')}</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">How to manage cookies</h2>
          <p className="text-muted-foreground">{nbsp('You can set your browser not to accept cookies. However, in a few cases, some of my website features (such as custom fonts or interactive elements) may not function as a result.')}</p>

          <h2 className="font-display text-lg text-foreground mt-8">Privacy policies of other websites</h2>
          <p className="text-muted-foreground">{nbsp('The Website contains links to other websites (such as Instagram or LinkedIn). My privacy policy applies only to my website, so if you click on a link to another website, you should read their privacy policy.')}</p>

          <h2 className="font-display text-lg text-foreground mt-8">Changes to my privacy policy</h2>
          <p className="text-muted-foreground">{nbsp('I keep my privacy policy under regular review and place any updates on this web page. This privacy policy was last updated on March 8, 2026.')}</p>

          <h2 className="font-display text-lg text-foreground mt-8">How to contact me</h2>
          <p className="text-muted-foreground">
            {nbsp('If you have any questions about this privacy policy, the data I hold on you, or you would like to exercise one of your data protection rights, please do not hesitate to contact me.')}
          </p>
          <p className="text-muted-foreground">
            {nbsp('Name: Zinaida Krivchenko')}<br />
            {nbsp('Location: Prague, Czechia')}<br />
            {nbsp('Contact: Telegram @theswansarenotwhattheyseem')}
          </p>

          <h2 className="font-display text-lg text-foreground mt-8">How to contact the appropriate authority</h2>
          <p className="text-muted-foreground">
            {nbsp('Should you wish to report a complaint or if you feel that I have not addressed your concern in a satisfactory manner, you may contact the Office for Personal Data Protection (Úřad pro ochranu osobních údajů) in the Czech Republic.')}
          </p>
          <p className="text-muted-foreground">
            {nbsp('Address: Pplk. Sochora 27, 170 00 Prague 7, Czech Republic')}<br />
            {nbsp('Email: posta@uoou.cz')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
