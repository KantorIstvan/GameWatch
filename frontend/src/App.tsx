import { Suspense, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Toaster } from '@/components/ui/sonner'
import Layout from './components/Layout'
import Timers from './pages/Timers'
import Statistics from './pages/Statistics'
import Games from './pages/Games'
import GameStatistics from './pages/GameStatistics'
import Timeline from './pages/Timeline'
import PlaythroughDetail from './pages/PlaythroughDetail'
import Health from './pages/Health'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Feed from './pages/Feed'
import Compare from './pages/Compare'
import Help from './pages/Help'
import Loading from './components/Loading'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { TimeFormatProvider } from './contexts/TimeFormatContext'
import { WeekStartProvider } from './contexts/WeekStartContext'
import { SessionTimerProvider } from './contexts/SessionTimerContext'
import { useHealthGoals } from './hooks/useHealthGoals'

function AppContent() {
  const { i18n } = useTranslation()
  const { isAuthenticated } = useAuth0()
  const { isAuthReady } = useAuthContext()
  
  // Monitor health goals globally
  useHealthGoals(isAuthenticated, isAuthReady)

  useEffect(() => {
    const rtlLanguages = ['ar', 'fa', 'ur'];
    const direction = rtlLanguages.includes(i18n.language) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language])

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Timers />} />
          <Route path="timers" element={<Timers />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="games" element={<Games />} />
          <Route path="games/:id/statistics" element={<GameStatistics />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="health" element={<Health />} />
          <Route path="playthrough/:id" element={<PlaythroughDetail />} />
          <Route path="feed" element={<Feed />} />
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
                  <AppContent />
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
