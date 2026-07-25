import { PRIVACY_POLICY_VERSION } from '@/components/CookieBanner';

const STORAGE_KEY = 'cookie-consent';

// Mirrors CookieBanner's own "is this acknowledged" check, so other fixed-
// position UI (like the constellation's audio controls) can know whether the
// banner is currently occupying the bottom of the viewport without coupling
// to CookieBanner's internal state.
export function isCookieBannerAcknowledged(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const record = JSON.parse(stored) as { policyVersion?: unknown };
    return record?.policyVersion === PRIVACY_POLICY_VERSION;
  } catch {
    return false;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

// CookieBanner calls this once the visitor dismisses the notice, so anything
// subscribed can drop its "leave room for the banner" adjustment immediately
// instead of waiting for a reload.
export function notifyCookieBannerAcknowledged() {
  listeners.forEach((l) => l());
}

export function subscribeCookieBannerAcknowledged(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
