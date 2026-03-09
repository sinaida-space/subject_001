import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 md:p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-display text-sm font-medium mb-2">Cookie Consent</h3>
            <p className="font-clinical text-xs text-muted-foreground leading-relaxed">
              This website uses cookies to enhance your browsing experience and analyze site traffic. 
              We respect your privacy and comply with GDPR regulations. You can manage your cookie 
              preferences or learn more in our{' '}
              <a 
                href="/privacy" 
                className="text-primary hover:text-primary/80 underline"
              >
                Privacy Policy
              </a>.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <Button
              onClick={handleAccept}
              size="sm"
              className="clinical-label text-xs"
            >
              Accept All
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              size="sm"
              className="clinical-label text-xs"
            >
              Decline
            </Button>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="p-2 md:p-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;