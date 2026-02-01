import { Suspense, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Layout from './components/Layout'
import Timers from './pages/Timers'
import Statistics from './pages/Statistics'
import Games from './pages/Games'
import GameStatistics from './pages/GameStatistics'
import Calendar from './pages/Calendar'
import PlaythroughDetail from './pages/PlaythroughDetail'
import Health from './pages/Health'
import Settings from './pages/Settings'
import Help from './pages/Help'
import Loading from './components/Loading'
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
          <Route path="calendar" element={<Calendar />} />
          <Route path="health" element={<Health />} />
          <Route path="playthrough/:id" element={<PlaythroughDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Routes>
      <ToastContainer
        position="bottom-right"
        autoClose={8000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={['ar', 'fa', 'ur'].includes(i18n.language)}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
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
        <AuthProvider>
          <SessionTimerProvider>
            <TimeFormatProvider>
              <WeekStartProvider>
                <AppContent />
              </WeekStartProvider>
            </TimeFormatProvider>
          </SessionTimerProvider>
        </AuthProvider>
      </ThemeProvider>
    </Suspense>
  )
}

export default App
