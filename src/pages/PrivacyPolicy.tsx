const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <a href="/" className="clinical-label text-primary hover:text-accent transition-colors mb-8 inline-block cursor-none">
          ← Back
        </a>

        <h1 className="font-display text-4xl font-light mb-8">Privacy Policy</h1>

        <div className="prose prose-invert font-clinical text-sm text-secondary-foreground space-y-6 leading-relaxed">
          <p>Zinaida Krivchenko ("I", "me", or "the Website") is committed to protecting your personal data.</p>

          <h2 className="font-display text-lg text-foreground mt-8">What data do I collect?</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Personal identification information (Name, email address, etc.) should you choose to reach out.</li>
            <li>Technical data such as IP addresses and browser types via standard web cookies.</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">How will I use your data?</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Respond to inquiries regarding collaborations, AI visuals, or interactive systems.</li>
            <li>Improve website functionality and user experience.</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">Your rights (GDPR)</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>The right to access your personal data.</li>
            <li>The right to rectification.</li>
            <li>The right to erasure.</li>
            <li>The right to restrict processing.</li>
          </ul>

          <h2 className="font-display text-lg text-foreground mt-8">Contact</h2>
          <p className="text-muted-foreground">
            Name: Zinaida Krivchenko<br />
            Location: Prague, Czechia<br />
            Email: sinkrivchenko@gmail.com<br />
            Telegram: @sinaida
          </p>

          <p className="text-muted-foreground text-xs mt-8">Last updated: March 8, 2026</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
