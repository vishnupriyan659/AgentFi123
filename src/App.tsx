import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SolanaProviders } from "@/components/intent/SolanaProviders";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/intent/Header";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// Pages
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import Portfolio from "./pages/Portfolio";
import Intelligence from "./pages/Intelligence";
import Simulation from "./pages/Simulation";
import MarketRadar from "./pages/MarketRadar";
import ExecutiveInsightsPage from "./pages/ExecutiveInsightsPage";
import EnterpriseReportsPage from "./pages/EnterpriseReportsPage";
import CopilotPage from "./pages/CopilotPage";
import AgentDebatePage from "./pages/AgentDebatePage";
import RecommendationsPage from "./pages/RecommendationsPage";
import SwapLabPage from "./pages/SwapLabPage";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Layout with sidebar for main pages
const MainLayout = () => (
  <div className="flex min-h-screen bg-background">
    <Sidebar />
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="flex-1 overflow-auto">
        <ErrorBoundary fallbackTitle="Application View Error" onReset={() => window.location.reload()}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  </div>
);

// Simple layout without sidebar for landing and 404
const SimpleLayout = () => (
  <div className="min-h-screen bg-background">
    <Outlet />
  </div>
);

const App = () => (
  <ErrorBoundary fallbackTitle="AgentFi Application Error" onReset={() => window.location.reload()}>
    <QueryClientProvider client={queryClient}>
      <SolanaProviders>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Root route safely redirects to /dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<SimpleLayout />}>
                <Route path="/landing" element={<Landing />} />
              </Route>
              
              {/* App routes with sidebar */}
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/intelligence" element={<Intelligence />} />
                <Route path="/simulation" element={<Simulation />} />
                <Route path="/swap-lab" element={<SwapLabPage />} />
                <Route path="/market-radar" element={<MarketRadar />} />

                {/* Executive Routes */}
                <Route path="/executive-insights" element={<ExecutiveInsightsPage />} />
                <Route path="/enterprise-reports" element={<EnterpriseReportsPage />} />
                <Route path="/ai-copilot" element={<CopilotPage />} />
                <Route path="/agent-debate" element={<AgentDebatePage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />

                {/* System Settings & Support Routes */}
                <Route path="/settings" element={<Settings />} />
                <Route path="/support" element={<Support />} />
                
                {/* Legacy redirects */}
                <Route path="/trade" element={<Navigate to="/agents" replace />} />
                <Route path="/transactions" element={<Navigate to="/portfolio" replace />} />
              </Route>
              
              {/* Catch-all */}
              <Route element={<SimpleLayout />}>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SolanaProviders>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
