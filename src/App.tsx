import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import CustomCursor from "@/components/CustomCursor";
import VHSStaticLayer from "@/components/VHSStaticLayer";
import CRTScreen from "@/components/CRTScreen";
import ECGTrace from "@/components/ECGTrace";
import { RenderModeProvider, useRenderMode } from "@/hooks/useRenderMode";

const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Collaborate = lazy(() => import("./pages/Collaborate"));
const WorkCase = lazy(() => import("./pages/WorkCase"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-hidden="true" />
);

// Site-wide, not per-page — every route gets the custom cursor (previously it
// only existed on Index/NotFound, so it silently vanished on every other page).
const SiteCursor = () => {
  const { mode } = useRenderMode();
  return mode === 'full' ? <CustomCursor /> : null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RenderModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/">
          <SiteCursor />
          <ECGTrace variant="ambient" />
          <VHSStaticLayer />
          <CRTScreen />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/collaborate" element={<Collaborate />} />
              {/* Old routes live in shared links and search results — keep redirecting */}
              <Route path="/booking" element={<Navigate to="/collaborate" replace />} />
              <Route path="/press" element={<Navigate to="/collaborate" replace />} />
              <Route path="/work/:slug" element={<WorkCase />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </RenderModeProvider>
  </QueryClientProvider>
);

export default App;
