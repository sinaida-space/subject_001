import { useEffect } from 'react';

// ── Client-side <head> tag sync ──
// Sets document.title, the description meta, canonical link, and the
// og:*/twitter:* title/description/url tags at runtime during SPA
// navigation. Vanilla DOM, no new dependency — the build-time static tags
// (scripts/prerender-routes.mjs) are what search engines and social
// crawlers actually see, since they don't execute JS; this hook just keeps
// the live document consistent for anyone who *does* run JS (browser tab
// title, "add to home screen", share sheets that read the live DOM, etc.)
// and any client-side navigation between routes.
//
// Every previous value is restored on unmount so navigating away (e.g. back
// to "/") doesn't leave a stale title/description/canonical behind.

export const SITE_NAME = 'sin.ai.da';

interface PageMetaOptions {
  title: string;
  description: string;
  /** Absolute URL, e.g. "https://sinaida.eu/work/redkie-ptitsy/". Optional — omit for pages without a stable canonical (e.g. 404). */
  canonical?: string;
}

function setMetaByName(name: string, content: string): { el: Element; prev: string | null } {
  let el = document.querySelector(`meta[name="${name}"]`);
  const prev = el?.getAttribute('content') ?? null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return { el, prev };
}

function setMetaByProperty(property: string, content: string): { el: Element; prev: string | null } {
  let el = document.querySelector(`meta[property="${property}"]`);
  const prev = el?.getAttribute('content') ?? null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return { el, prev };
}

/** Sets document.title, description, canonical, and og/twitter title+description(+url). Restores everything on unmount. */
export function usePageMeta({ title, description, canonical }: PageMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const restorers: Array<() => void> = [
      () => {
        document.title = prevTitle;
      },
    ];

    const desc = setMetaByName('description', description);
    restorers.push(() => {
      if (desc.prev !== null) desc.el.setAttribute('content', desc.prev);
    });

    const ogTitle = setMetaByProperty('og:title', title);
    restorers.push(() => {
      if (ogTitle.prev !== null) ogTitle.el.setAttribute('content', ogTitle.prev);
    });

    const ogDescription = setMetaByProperty('og:description', description);
    restorers.push(() => {
      if (ogDescription.prev !== null) ogDescription.el.setAttribute('content', ogDescription.prev);
    });

    const twitterTitle = setMetaByName('twitter:title', title);
    restorers.push(() => {
      if (twitterTitle.prev !== null) twitterTitle.el.setAttribute('content', twitterTitle.prev);
    });

    const twitterDescription = setMetaByName('twitter:description', description);
    restorers.push(() => {
      if (twitterDescription.prev !== null) twitterDescription.el.setAttribute('content', twitterDescription.prev);
    });

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      const prevHref = link?.getAttribute('href') ?? null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
      restorers.push(() => {
        if (prevHref !== null) link.setAttribute('href', prevHref);
      });

      const ogUrl = setMetaByProperty('og:url', canonical);
      restorers.push(() => {
        if (ogUrl.prev !== null) ogUrl.el.setAttribute('content', ogUrl.prev);
      });
    }

    return () => {
      for (const restore of restorers) restore();
    };
  }, [title, description, canonical]);
}

/** Sets (and restores) the robots meta tag to noindex while a page is mounted, e.g. NotFound. */
export function useNoIndex() {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    const prev = meta?.getAttribute('content') ?? null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, follow');

    return () => {
      if (prev !== null) meta.setAttribute('content', prev);
      else meta.removeAttribute('content');
    };
  }, []);
}
