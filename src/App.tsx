import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";
import MapScreen from "@/pages/MapScreen";
import NearbyScreen from "@/pages/NearbyScreen";
import ExploreScreen from "@/pages/ExploreScreen";
import FriendsScreen from "@/pages/FriendsScreen";
import PingsScreen from "@/pages/PingsScreen";
import ProfileScreen from "@/pages/ProfileScreen";
import TabBar from "@/components/TabBar";
import PersonProfileHost from "@/components/PersonProfileHost";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div key={location.pathname} className="screen-enter">
        {children}
      </div>
      <TabBar />
      <PersonProfileHost />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><MapScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/nearby" element={<ProtectedRoute><AppLayout><NearbyScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><AppLayout><ExploreScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><AppLayout><FriendsScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/pings" element={<ProtectedRoute><AppLayout><PingsScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfileScreen /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
