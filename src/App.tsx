import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";
import OAuthConsent from "@/pages/OAuthConsent";
import MapScreen from "@/pages/MapScreen";
import NearbyScreen from "@/pages/NearbyScreen";
import ExploreScreen from "@/pages/ExploreScreen";
import FriendsScreen from "@/pages/FriendsScreen";
import PingsScreen from "@/pages/PingsScreen";
import MessagesInbox from "@/pages/MessagesInbox";
import ConversationScreen from "@/pages/ConversationScreen";
import NewMessage from "@/pages/NewMessage";
import ProfileScreen from "@/pages/ProfileScreen";
import Onboarding from "@/pages/Onboarding";
import Preferences from "@/pages/Preferences";
import TabBar from "@/components/TabBar";
import PersonProfileHost from "@/components/PersonProfileHost";
import NotFound from "./pages/NotFound.tsx";
import { useIntakeStatus } from "@/hooks/useIntakeStatus";

const queryClient = new QueryClient();

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children, allowIncomplete = false }: { children: React.ReactNode; allowIncomplete?: boolean }) {
  const { session, loading } = useAuth();
  const { status } = useIntakeStatus();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/auth" replace />;
  if (status === 'loading') return <Loading />;
  if (!allowIncomplete && status === 'incomplete') return <Navigate to="/onboarding" replace />;
  if (allowIncomplete && status === 'complete') {
    // Onboarding route: block re-entry when done.
    return <Navigate to="/" replace />;
  }
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
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/onboarding" element={
              <ProtectedRoute allowIncomplete>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/preferences" element={
              <ProtectedRoute>
                <Preferences />
              </ProtectedRoute>
            } />
            <Route path="/" element={<ProtectedRoute><AppLayout><MapScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/nearby" element={<ProtectedRoute><AppLayout><NearbyScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><AppLayout><ExploreScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><AppLayout><FriendsScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/pings" element={<ProtectedRoute><AppLayout><PingsScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><AppLayout><MessagesInbox /></AppLayout></ProtectedRoute>} />
            <Route path="/messages/new" element={<ProtectedRoute><AppLayout><NewMessage /></AppLayout></ProtectedRoute>} />
            <Route path="/messages/:convId" element={<ProtectedRoute><AppLayout><ConversationScreen /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfileScreen /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
