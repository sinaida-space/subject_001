import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { notifyCookieBannerAcknowledged } from '@/lib/cookieBannerVisibility';

// Bump this when the Privacy Policy's substance changes, so an acknowledgement
// recorded against an older disclosure can be told apart from one against the
// current text. Tracks the "last updated" date in PrivacyPolicy.tsx, with a
// suffix when the policy changes substantively more than once in a day.
//
// -2 covers the Cloudflare and analytics disclosure. The version deployed
// earlier today stated the site used no analytics, so anyone who acknowledged
// that gets shown the notice again rather than being left with a stale claim.
export const PRIVACY_POLICY_VERSION = '2026-07-24-2';

// Removes the stored acknowledgement and reloads so the notice shows again.
// Guarded in a try/catch: Safari private mode throws on localStorage access.
export function resetStorageNotice() {
  try {
    localStorage.removeItem('cookie-consent');
  } catch {
    // localStorage unavailable (e.g. Safari private mode) — nothing to clear.
  }
  window.location.reload();
}

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cookie-consent');
      if (!stored) {
        setIsVisible(true);
        return;
      }
      // Show the notice again when it was acknowledged against an older
      // version of the policy. Recording the version was pointless while
      // nothing ever compared it. Anything unparseable (hand-edited, or the
      // bare string this key used to hold) counts as not acknowledged.
      const record = JSON.parse(stored) as { policyVersion?: unknown };
      if (record?.policyVersion !== PRIVACY_POLICY_VERSION) {
        setIsVisible(true);
      }
    } catch {
      // localStorage unavailable, or a malformed record: show the notice.
      setIsVisible(true);
    }
  }, []);

  const handleAcknowledge = () => {
    try {
      localStorage.setItem('cookie-consent', JSON.stringify({
        choice: 'acknowledged',
        timestamp: new Date().toISOString(),
        policyVersion: PRIVACY_POLICY_VERSION,
      }));
    } catch {
      // localStorage unavailable — the notice will simply reappear next visit.
    }
    setIsVisible(false);
    notifyCookieBannerAcknowledged();
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="notice-surface fixed bottom-0 left-0 right-0 z-50 py-4"
    >
      {/* Same container and gutter as Footer.tsx, so the notice's text starts
          on the site's own left edge instead of a narrower one of its own. */}
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="font-clinical text-xs text-muted-foreground">
            No tracking cookies. Aggregate visit statistics only.{' '}
            <a
              href="/privacy"
              className="underline transition-colors"
            >
              Privacy Policy
            </a>
          </p>

          <div className="shrink-0">
            <Button
              onClick={handleAcknowledge}
              variant="outline"
              size="sm"
              className="font-clinical text-xs tracking-widest uppercase border-border text-foreground hover:bg-accent/10 hover:text-foreground"
            >
              GOT IT
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
