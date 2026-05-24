import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { syncToCloud, pullFromCloud } from './services/syncService';

// Providers
import { DatabaseProvider, useDatabase } from './contexts/DatabaseContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlanProvider } from './contexts/PlanContext';
import { useDailyTrainingReminder, requestNotificationPermission } from './hooks/useDailyTrainingReminder';

// Layout
import { TabBar } from './components/navigation/TabBar';
import { ToastContainer } from './components/ui/ToastContainer';
import { Spinner } from './components/ui/Spinner';

// Screens
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { LogRunScreen } from './screens/LogRunScreen';
import { StatsScreen } from './screens/StatsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { MyPlansScreen } from './screens/MyPlansScreen';
import { PlanDetailScreen } from './screens/PlanDetailScreen';
import { PlanEditorScreen } from './screens/PlanEditorScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { SocialScreen } from './screens/SocialScreen';
import { FindFriendsScreen } from './screens/FindFriendsScreen';
import { FriendProfileScreen } from './screens/FriendProfileScreen';
import { SharePlanScreen } from './screens/SharePlanScreen';
import { CommunityPlanDetailScreen } from './screens/CommunityPlanDetailScreen';
import { RunDetailScreen } from './screens/RunDetailScreen';
import { LogEntryScreen } from './screens/LogEntryScreen';
import { LiveRunScreen } from './screens/LiveRunScreen';

// ---------------------------------------------------------------------------
// Gate: show splash until DB is ready, redirect to onboarding if needed
// ---------------------------------------------------------------------------

function AppShell() {
  const { isReady, error } = useDatabase();
  const { db } = useDatabase();
  const { settings, isLoaded } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Local daily training reminder (simple, app-local)
  useDailyTrainingReminder();

  // Request notification permission on startup if reminder is enabled
  useEffect(() => {
    if (!isLoaded || !settings.daily_reminder_enabled) return;
    void requestNotificationPermission().then(({ granted, needsSettings }) => {
      if (!granted && needsSettings) {
        console.warn('[Notifications] Permission denied. User needs to enable in iOS Settings.');
      }
    });
  }, [isLoaded, settings.daily_reminder_enabled]);

  // Auto-sync on startup when logged in
  useEffect(() => {
    if (!isReady || !db || !user) return;
    pullFromCloud(db).catch(() => {});
    syncToCloud(db).catch(() => {});
  }, [isReady, db, user]);

  useEffect(() => {
    if (!isLoaded) return;
    const onboardingPaths = ['/onboarding', '/auth'];
    const isOnboarding = onboardingPaths.some(p => location.pathname.startsWith(p));
    if (!settings.onboarding_complete && !isOnboarding) {
      navigate('/onboarding', { replace: true });
    }
    // If user is logged in and sitting on the auth screen, send them home
    if (user && location.pathname.startsWith('/auth')) {
      navigate('/home', { replace: true });
    }
  }, [isLoaded, settings.onboarding_complete, user, location.pathname]);

  if (!isReady || !isLoaded) {
        return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center flex-col gap-4">
        {error ? (
          <p className="text-red-500 text-sm px-4 text-center">Database error: {error}</p>
        ) : (
          <>
            <span className="text-5xl">🏃</span>
            <Spinner size="lg" className="text-primary-500" />
          </>
        )}
          </div>
        );
  }

  const isTabRoute =
    location.pathname.startsWith('/home') ||
    location.pathname.startsWith('/calendar') ||
    location.pathname.startsWith('/log') ||
    location.pathname.startsWith('/stats') ||
    location.pathname.startsWith('/profile') ||
    location.pathname.startsWith('/social') ||
    location.pathname.startsWith('/community');

  // Hide the bottom nav on the live run screen so you can't tab away mid-run
  const showTabBar = isTabRoute && !location.pathname.startsWith('/log/live');

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-hidden flex flex-col">
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Onboarding & Auth */}
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/auth" element={<AuthScreen />} />

          {/* Main tabs */}
          <Route path="/home" element={<DashboardScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/log" element={<LogEntryScreen />} />
          <Route path="/log/manual" element={<LogRunScreen />} />
          <Route path="/log/edit/:id" element={<LogRunScreen />} />
          <Route path="/log/live" element={<LiveRunScreen />} />
          <Route path="/runs/:id" element={<RunDetailScreen />} />
          <Route path="/stats" element={<StatsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />

          {/* Profile sub-routes */}
          <Route path="/profile/plans" element={<MyPlansScreen />} />
          <Route path="/profile/plans/new" element={<PlanEditorScreen />} />
          <Route path="/profile/plans/:id" element={<PlanDetailScreen />} />
          <Route path="/profile/goals" element={<GoalsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />

          {/* Social */}
          <Route path="/social" element={<SocialScreen />} />
          <Route path="/social/search" element={<FindFriendsScreen />} />
          <Route path="/social/profile/:id" element={<FriendProfileScreen />} />

          {/* Community */}
          <Route path="/community" element={<CommunityScreen />} />
          <Route path="/community/share" element={<SharePlanScreen />} />
          <Route path="/community/:id" element={<CommunityPlanDetailScreen />} />
        </Routes>
      </div>

      {/* Tab bar only on main routes (exclude live run) */}
      {showTabBar && <TabBar />}

      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DatabaseProvider>
        <SettingsProvider>
          <ToastProvider>
            <AuthProvider>
              <PlanProvider>
                <AppShell />
              </PlanProvider>
            </AuthProvider>
          </ToastProvider>
        </SettingsProvider>
      </DatabaseProvider>
    </BrowserRouter>
  );
}
