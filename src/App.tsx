import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CustomerDashboardPage from "./pages/CustomerDashboardPage";
import DriverDashboardPage from "./pages/DriverDashboardPage";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

// Protected route for admin
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!profile?.is_admin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard/customer" element={<CustomerDashboardPage />} />
            <Route path="/dashboard/driver" element={<DriverDashboardPage />} />
            <Route path="/admin" element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
