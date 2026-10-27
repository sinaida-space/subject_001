import { Suspense, lazy, useEffect, useLayoutEffect, type ComponentType } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import CustomCursor from "@/components/CustomCursor";
import WebMcpTools from "@/components/WebMcpTools";
import RouteEnhancer from "@/components/RouteEnhancer";
import DiveHost from "@/components/dive/DiveHost";
import { RenderModeProvider, useRenderMode, type RenderMode } from "@/hooks/useRenderMode";
import { routeChunks } from "@/lib/routeChunks";
import { startHalation } from "@/lib/halation";
import { afterHydration, hydration } from "@/lib/hydration";
import { rememberHomeScroll, restoreHomeScroll, takeHomeReturn } from "@/lib/homeScroll";

const Index = lazy(routeChunks.home);
const PrivacyPolicy = lazy(routeChunks.privacy);
const Machines = lazy(routeChunks.machines);
const Licensing = lazy(routeChunks.licensing);
const Collaborate = lazy(routeChunks.collaborate);
const Statement = lazy(routeChunks.statement);
const WorkCase = lazy(routeChunks.work);
const Practice = lazy(routeChunks.practice);
const EffectsOverview = lazy(routeChunks.effects);
const NotFound = lazy(routeChunks.notFound);

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-hidden="true" />
);

// Full mode only: the red halation on large display headlines. Idle at rest.
const SiteLight = () => {
  const { mode } = useRenderMode();
  useEffect(() => {
    if (mode !== 'full') return;
    // it marks headlines in the DOM, so not before a hydrating page is adopted
    let live = true;
    let stop: (() => void) | undefined;
    afterHydration(() => {
      if (live) stop = startHalation();
    });
    return () => {
      live = false;
      stop?.();
    };
  }, [mode]);
  return null;
};

// A route change (e.g. clicking "View full case study") should land at the
// top of the new page — the browser otherwise keeps whatever scroll offset
// the previous page was at. Only fires on pathname change, not on in-page
// hash navigation (Index handles its own #section scrolling).
// Coming back home from a case (browser Back, or the case's own Back link)
// returns to the spot the case was opened from; see lib/homeScroll.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  // Layout effect, so the reset lands before paint and inside a view
  // transition's update (see RouteEnhancer) rather than after the snapshot.
  useLayoutEffect(() => {
    const back = takeHomeReturn() || navType === "POP";
    if (pathname === "/" && back && restoreHomeScroll()) return;
    // instant: html has scroll-behavior: smooth, which would otherwise glide
    // the new page up from the old offset
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a route change resets
  }, [pathname]);
  // Remember where home was when a case link is followed from it.
  useEffect(() => {
    if (pathname !== "/") return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (a && a.getAttribute("href")?.startsWith("/work/")) rememberHomeScroll();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);
  return null;
};

// Pages that arrive rendered at build time, passed in already loaded in
// place of their lazy route, so hydration never suspends on the chunk.
export interface HydratedPages {
  home?: ComponentType;
  work?: ComponentType;
  statement?: ComponentType;
  machines?: ComponentType;
  practice?: ComponentType;
  collaborate?: ComponentType;
  privacy?: ComponentType;
  licensing?: ComponentType;
}

// Everything inside the router. Shared with the build-time renders
// (src/entry-shell.tsx), so a hydrated page has the same tree, and the same
// useId values, on the server and in the browser.
export const AppRoutes = ({ pages = {} }: { pages?: HydratedPages }) => {
  const Home = pages.home ?? Index;
  const Work = pages.work ?? WorkCase;
  const StatementPage = pages.statement ?? Statement;
  const MachinesPage = pages.machines ?? Machines;
  const PracticePage = pages.practice ?? Practice;
  const CollaboratePage = pages.collaborate ?? Collaborate;
  const PrivacyPage = pages.privacy ?? PrivacyPolicy;
  const LicensingPage = pages.licensing ?? Licensing;
  return (
  <>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:bg-background focus:text-primary-legible focus:border focus:border-primary focus:px-4 focus:py-2 focus:font-mono focus:uppercase focus:text-sm focus:tracking-widest"
    >
      Skip to content
    </a>
    <ScrollToTop />
    <RouteEnhancer />
    <DiveHost />
    {/* site-wide, every route: the red arrow in both modes, on Void and on Chalk */}
    <CustomCursor />
    <SiteLight />
    <WebMcpTools />
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/licensing" element={<LicensingPage />} />
        <Route path="/license" element={<Navigate to="/licensing" replace />} />
        <Route path="/collaborate" element={<CollaboratePage />} />
        <Route path="/statement" element={<StatementPage />} />
        <Route path="/machines" element={<MachinesPage />} />
        {/* Old routes live in shared links and search results — keep redirecting */}
        <Route path="/booking" element={<Navigate to="/collaborate" replace />} />
        <Route path="/press" element={<Navigate to="/collaborate" replace />} />
        <Route path="/work/:slug" element={<Work />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/practice/:slug" element={<PracticePage />} />
        {/* internal reference: unlinked, noindex */}
        <Route path="/drafts/effects" element={<EffectsOverview />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <HydrationDone />
    </Suspense>
  </>
  );
};

// Inside the Suspense boundary, after the routes: its effect runs once the
// boundary's content has been adopted, the last pass of hydration.
function HydrationDone() {
  useEffect(() => hydration.finish(), []);
  return null;
}

// `hydrate` is the render mode of the build-time markup being adopted; the
// first render uses it, and RenderModeProvider re-detects afterwards.
const App = ({ hydrate, pages }: { hydrate?: RenderMode; pages?: HydratedPages }) => (
  <RenderModeProvider initialMode={hydrate}>
    <BrowserRouter basename="/">
      <AppRoutes pages={pages} />
    </BrowserRouter>
  </RenderModeProvider>
);

export default App;
