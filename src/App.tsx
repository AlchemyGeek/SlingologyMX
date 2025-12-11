import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import FeatureRequests from "./pages/FeatureRequests";
import BugReports from "./pages/BugReports";
import Profile from "./pages/Profile";
import Disclaimer from "./pages/Disclaimer";
import DataManagement from "./pages/DataManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/feature-requests" element={<FeatureRequests />} />
          <Route path="/bug-reports" element={<BugReports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/data-management" element={<DataManagement />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
