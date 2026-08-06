import { Suspense, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Toaster } from '@/components/ui/sonner'
import Layout from './components/Layout'
import Onboarding from './pages/Onboarding'
import Timers from './pages/Timers'
import Statistics from './pages/Statistics'
import Games from './pages/Games'
import GameStatistics from './pages/GameStatistics'
import Catalog from './pages/Catalog'
import CatalogGameDetail from './pages/CatalogGameDetail'
import Timeline from './pages/Timeline'
import PlaythroughDetail from './pages/PlaythroughDetail'
import Health from './pages/Health'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import MyProfile from './pages/MyProfile'
import People from './pages/People'
import Feed from './pages/Feed'
import Compare from './pages/Compare'
import Help from './pages/Help'
import Loading from './components/Loading'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { TimeFormatProvider } from './contexts/TimeFormatContext'
import { WeekStartProvider } from './contexts/WeekStartContext'
import { SessionTimerProvider } from './contexts/SessionTimerContext'
import { useHealthGoals } from './hooks/useHealthGoals'

function AppContent() {
  const { i18n } = useTranslation()
  const { isAuthenticated } = useAuth0()
  const { isAuthReady } = useAuthContext()
  const { status: onboardingStatus, loading: onboardingLoading } = useOnboarding()
  const location = useLocation()

  // Monitor health goals globally
  useHealthGoals(isAuthenticated, isAuthReady)

  useEffect(() => {
    const rtlLanguages = ['ar', 'fa', 'ur'];
    const direction = rtlLanguages.includes(i18n.language) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language])

  // Held on a plain loading screen, not the app, until onboarding status is known - a
  // signed-in session that briefly rendered the full app before redirecting to onboarding
  // is exactly the flash this guard exists to prevent.
  if (isAuthenticated && (!isAuthReady || onboardingLoading)) {
    return <Loading />
  }

  // A missing handle or display name makes an account unrenderable everywhere else in the
  // app, so onboarding blocks every other route until both are set. A failed status fetch
  // (status === null after loading) is read as "let them through" rather than "block
  // them" - see OnboardingContext for why.
  const needsOnboarding = isAuthenticated && onboardingStatus !== null && !onboardingStatus.completed
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  if (!needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Timers />} />
          <Route path="timers" element={<Timers />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="games" element={<Games />} />
          <Route path="games/:id/statistics" element={<GameStatistics />} />
          <Route path="catalog" element={<Catalog />} />
          {/* IGDB id, not a row id - the catalog reaches games this app has no row for. */}
          <Route path="catalog/:externalId" element={<CatalogGameDetail />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="health" element={<Health />} />
          <Route path="playthrough/:id" element={<PlaythroughDetail />} />
          <Route path="people" element={<People />} />
          <Route path="feed" element={<Feed />} />
          {/* Your own profile has its own route rather than /u/<your handle>: it has to
              render before a handle is claimed, since claiming one happens here. */}
          <Route path="profile" element={<MyProfile />} />
          <Route path="u/:handle" element={<Profile />} />
          <Route path="u/:handle/compare" element={<Compare />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Routes>
      <Toaster
        duration={8000}
        dir={['ar', 'fa', 'ur'].includes(i18n.language) ? 'rtl' : 'ltr'}
        closeButton
      />
    </>
  )
}

function App() {
  const { isLoading } = useAuth0()

  if (isLoading) {
    return <Loading />
  }

  return (
    <Suspense fallback={<Loading />}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <SessionTimerProvider>
              <TimeFormatProvider>
                <WeekStartProvider>
                  <OnboardingProvider>
                    <AppContent />
                  </OnboardingProvider>
                </WeekStartProvider>
              </TimeFormatProvider>
            </SessionTimerProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </Suspense>
  )
}

export default App
