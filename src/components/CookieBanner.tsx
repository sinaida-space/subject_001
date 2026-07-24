import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Bump this when the Privacy Policy's substance changes — recorded alongside
// each consent choice so an old choice can be told apart from consent to the
// current policy. Keep in sync with the "last updated" date in PrivacyPolicy.tsx.
export const PRIVACY_POLICY_VERSION = '2026-07-24';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const recordConsent = (choice: 'accepted' | 'essential' | 'declined') => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      choice,
      timestamp: new Date().toISOString(),
      policyVersion: PRIVACY_POLICY_VERSION,
    }));
    setIsVisible(false);
  };

  const handleAccept = () => recordConsent('accepted');
  const handleEssential = () => recordConsent('essential');
  const handleDecline = () => recordConsent('declined');

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 md:p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-display text-sm font-medium mb-2 text-foreground">Cookie Consent</h3>
            <p className="font-clinical text-xs text-muted-foreground leading-relaxed">
              This website stores your consent choice locally and uses essential browser storage for
              basic site functionality. Learn more in our{' '}
              <a 
                href="/privacy" 
                className="text-primary hover:text-primary/80 underline"
              >
                Privacy Policy
              </a>.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 shrink-0">
            <Button
              onClick={handleAccept}
              variant="outline"
              size="sm"
              className="font-clinical text-xs tracking-widest uppercase border-border text-foreground hover:bg-accent/10 hover:text-foreground"
            >
              Accept All
            </Button>
            <Button
              onClick={handleEssential}
              variant="outline"
              size="sm"
              className="font-clinical text-xs tracking-widest uppercase border-border text-foreground hover:bg-accent/10 hover:text-foreground"
            >
              Essential Only
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              size="sm"
              className="font-clinical text-xs tracking-widest uppercase border-border text-foreground hover:bg-accent/10 hover:text-foreground"
            >
              Decline All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
