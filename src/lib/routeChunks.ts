// ── Route chunk importers, shared by the lazy routes in App.tsx and the
// hover/focus prefetch in RouteEnhancer. Calling an importer twice returns
// the same cached module promise, so prefetching simply warms the chunk the
// lazy route will ask for.

export const routeChunks = {
  privacy: () => import('@/pages/PrivacyPolicy'),
  licensing: () => import('@/pages/Licensing'),
  collaborate: () => import('@/pages/Collaborate'),
  experiences: () => import('@/pages/Experiences'),
  statement: () => import('@/pages/Statement'),
  work: () => import('@/pages/WorkCase'),
  notFound: () => import('@/pages/NotFound'),
};

/** Maps an in-app pathname to its chunk, or null for anything that is not a
 * client-side route (files, llms.txt, the CV PDF and so on). */
export function chunkForPath(pathname: string): (() => Promise<unknown>) | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return () => Promise.resolve();
  if (path === '/privacy') return routeChunks.privacy;
  if (path === '/licensing' || path === '/license') return routeChunks.licensing;
  if (path === '/collaborate' || path === '/booking' || path === '/press') return routeChunks.collaborate;
  if (path === '/experiences') return routeChunks.experiences;
  if (path === '/statement') return routeChunks.statement;
  if (/^\/work\/[^/.]+$/.test(path)) return routeChunks.work;
  return null;
}
