import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FeatureAccessProvider } from './contexts/FeatureAccessContext';
import { RedditAccountProvider, useRedditAccounts } from './contexts/RedditAccountContext';
import { AnalysisProvider } from './contexts/AnalysisContext';
import { CampaignProvider } from './contexts/CampaignContext';
import { CSRFProvider } from './contexts/CSRFContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import AnalysisStatusIndicator from './components/AnalysisStatusIndicator';
import { Menu } from 'lucide-react';
import { useRedirectHandler } from './lib/useRedirectHandler';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy-loaded components to reduce initial bundle size
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const SubredditAnalysis = lazy(() => import('./pages/SubredditAnalysis'));
const Projects = lazy(() => import('./pages/Projects'));
const Calendar = lazy(() => import('./pages/Calendar'));
const ProjectView = lazy(() => import('./pages/ProjectView'));
const SavedList = lazy(() => import('./pages/SavedList'));
const SpyGlass = lazy(() => import('./pages/SpyGlass'));
const RedditAccounts = lazy(() => import('./pages/RedditAccounts'));
const RedditOAuthCallback = lazy(() => import('./pages/RedditOAuthCallback'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Pricing = lazy(() => import('./pages/Pricing'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const OnlyFansLandingPage = lazy(() => import('./pages/OnlyFans'));
const EComLandingPage = lazy(() => import('./pages/eCom'));
const CampaignsPage = lazy(() => import('./pages/Campaigns'));
const CampaignDetailPage = lazy(() => import('./pages/Campaigns/CampaignDetail'));
const MediaLibraryPage = lazy(() => import('./pages/Campaigns/MediaLibrary'));

// Safely implements redirect handling
function RedirectHandler() {
  try {
    useRedirectHandler();
  } catch (error) {
    console.error("Failed to initialize redirect handler:", error);
  }
  return null;
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Force a refresh of account status when loading a private route
  const { refreshAccountStatus, isLoading: redditAccountsLoading } = useRedditAccounts();
  // Track if we've already checked the account status for this component instance
  const [hasCheckedAccounts, setHasCheckedAccounts] = useState(false);
  
  // Use an effect to check for Reddit accounts when this component mounts, but only once
  useEffect(() => {
    if (user && !redditAccountsLoading && !hasCheckedAccounts) {
      console.log('PrivateRoute: Initial Reddit account status check');
      refreshAccountStatus();
      setHasCheckedAccounts(true);
    }
  }, [user, redditAccountsLoading, refreshAccountStatus, hasCheckedAccounts]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex">
      <Sidebar isMobileOpen={isSidebarOpen} onMobileClose={() => setIsSidebarOpen(false)} />
      
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 md:hidden z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#111111] border-b border-[#333333] md:hidden z-10 flex items-center justify-between px-4">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="text-gray-400 hover:text-white p-2 -ml-2 rounded-full hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        
        <div className="text-lg font-medium truncate px-4">SubPirate</div>
        
        <div className="w-10"></div>
      </div>
      
      <main className="flex-1 md:ml-[240px] p-4 md:p-6 lg:p-8 mt-16 md:mt-0">
        {children}
      </main>
    </div>
  );
}

// Simple error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="mb-4 text-red-400">{error.message}</p>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}

function App() {
  // Don't use redirect handler outside of Router
  // It will be handled inside each route instead
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <FeatureAccessProvider>
          <QueryClientProvider client={queryClient}>
            <CSRFProvider>
              <Router>
                <RedditAccountProvider>
                  <AnalysisProvider>
                  <CampaignProvider>
                    <RedirectHandler />
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                      <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/onlyfans" element={<OnlyFansLandingPage />} />
                      <Route path="/ecom" element={<EComLandingPage />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/auth/reddit/callback" element={
                        <PrivateRoute>
                          <RedditOAuthCallback />
                        </PrivateRoute>
                      } />
                      <Route path="/dashboard" element={
                        <PrivateRoute>
                          <Dashboard />
                        </PrivateRoute>
                      } />
                      <Route path="/saved" element={
                        <PrivateRoute>
                          <SavedList />
                        </PrivateRoute>
                      } />
                      <Route path="/settings" element={
                        <PrivateRoute>
                          <Settings />
                        </PrivateRoute>
                      } />
                      <Route path="/analytics" element={
                        <PrivateRoute>
                          <Analytics />
                        </PrivateRoute>
                      } />
                      <Route path="/analysis/:subreddit" element={
                        <PrivateRoute>
                          <SubredditAnalysis />
                        </PrivateRoute>
                      } />
                      <Route path="/projects" element={
                        <PrivateRoute>
                          <Projects />
                        </PrivateRoute>
                      } />
                      <Route path="/projects/:projectId" element={
                        <PrivateRoute>
                          <ProjectView />
                        </PrivateRoute>
                      } />
                      <Route path="/calendar" element={
                        <PrivateRoute>
                          <Calendar />
                        </PrivateRoute>
                      } />
                      <Route path="/spyglass" element={
                        <PrivateRoute>
                          <SpyGlass />
                        </PrivateRoute>
                      } />
                      <Route path="/accounts" element={
                        <PrivateRoute>
                          <RedditAccounts />
                        </PrivateRoute>
                      } />
                      <Route path="/campaigns/media" element={
                        <PrivateRoute>
                          <MediaLibraryPage />
                        </PrivateRoute>
                      } />
                      <Route path="/campaigns" element={
                        <PrivateRoute>
                          <CampaignsPage />
                        </PrivateRoute>
                      } />
                      <Route path="/campaigns/:id" element={
                        <PrivateRoute>
                          <CampaignDetailPage />
                        </PrivateRoute>
                      } />
                    </Routes>
                  </Suspense>
                  <AnalysisStatusIndicator />
                </CampaignProvider>
                </AnalysisProvider>
                </RedditAccountProvider>
              </Router>
            </CSRFProvider>
          </QueryClientProvider>
        </FeatureAccessProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;