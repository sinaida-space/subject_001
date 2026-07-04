import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { RenderModeProvider } from "@/hooks/useRenderMode";

const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Booking = lazy(() => import("./pages/Booking"));
const Press = lazy(() => import("./pages/Press"));
const WorkCase = lazy(() => import("./pages/WorkCase"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-hidden="true" />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RenderModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/press" element={<Press />} />
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
