import { useAuth0 } from '@auth0/auth0-react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Settings as SettingsIcon, Menu as MenuIcon, Timer, BarChart, Gamepad2, CalendarDays, X, Heart, CircleHelp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import Footer from './Footer'

function Layout() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0()
  const { mode, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const [showNavbar, setShowNavbar] = useState<boolean>(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const currentTab = location.pathname === '/statistics' ? '/statistics' : location.pathname.startsWith('/games') ? '/games' : location.pathname === '/calendar' ? '/calendar' : location.pathname === '/health' ? '/health' : '/'
  const isMobile = useMediaQuery('(max-width:900px)')

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY < 10) {
        setShowNavbar(true)
      } else if (currentScrollY > lastScrollY) {
        setShowNavbar(false)
      } else {
        setShowNavbar(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } })
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const navigationItems = [
    { label: t('nav.timers'), path: '/', icon: <Timer className="size-4.5" /> },
    { label: t('nav.statistics'), path: '/statistics', icon: <BarChart className="size-4.5" /> },
    { label: t('nav.myGames'), path: '/games', icon: <Gamepad2 className="size-4.5" /> },
    { label: t('nav.calendar'), path: '/calendar', icon: <CalendarDays className="size-4.5" /> },
    { label: t('nav.health'), path: '/health', icon: <Heart className="size-4.5" /> },
  ]

  if (!isAuthenticated) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-bg">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="absolute right-4 top-4 text-text-primary"
        >
          {mode === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
        <div className="mx-auto max-w-sm px-4 text-center">
          <h1 className="mb-2 text-5xl font-light tracking-wide text-text-primary md:text-6xl">
            {t('app.name')}
          </h1>

          <p className="mb-12 font-light tracking-wide text-text-secondary">
            {t('app.tagline')}
          </p>

          <Button
            variant="outline"
            size="lg"
            onClick={() => loginWithRedirect({
              authorizationParams: {
                prompt: 'select_account'
              }
            })}
            className="px-12 py-6 tracking-wide"
          >
            {t('auth.login')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={cn(
          'sticky top-0 z-40 border-b border-border/40 bg-surface/72 backdrop-blur-xl transition-transform duration-300 ease-standard',
          showNavbar ? 'translate-y-0' : '-translate-y-full'
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <p className="flex-1 bg-linear-to-br from-[#667eea] to-[#764ba2] bg-clip-text text-xl font-medium tracking-tight text-transparent sm:text-h4">
            {t('app.name')}
          </p>

          {!isMobile && (
            <nav className="mr-3 flex items-center gap-1">
              {[
                { label: t('nav.timers'), path: '/' },
                { label: t('nav.statistics'), path: '/statistics' },
                { label: t('nav.myGames'), path: '/games' },
                { label: t('nav.calendar'), path: '/calendar' },
                { label: t('nav.health'), path: '/health' },
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative rounded-md px-3 py-2 text-body-sm font-medium text-text-secondary transition-colors hover:bg-accent/8 hover:text-accent',
                    currentTab === item.path && 'text-accent after:absolute after:inset-x-2 after:-bottom-px after:h-0.75 after:rounded-full after:bg-accent'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="mr-1.5 text-text-secondary"
            >
              <MenuIcon className="size-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="mr-1.5 text-text-secondary transition-transform hover:rotate-20 hover:text-accent"
          >
            {mode === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full p-0.5 hover:scale-105">
                <Avatar className="size-9.5 border-2 border-accent/30">
                  <AvatarImage src={user?.picture} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-50">
              <DropdownMenuLabel className="font-medium">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <SettingsIcon className="size-4" />
                  {t('nav.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/help">
                  <CircleHelp className="size-4" />
                  {t('footer.help')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>{t('auth.logout')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-70 bg-surface/95 backdrop-blur-xl">
          <div className="flex items-center justify-between p-4">
            <p className="bg-linear-to-br from-[#667eea] to-[#764ba2] bg-clip-text text-h4 font-medium text-transparent">
              {t('app.name')}
            </p>
            <Button variant="ghost" size="icon" onClick={closeMobileMenu} className="text-text-secondary">
              <X className="size-5" />
            </Button>
          </div>
          <Separator />
          <nav className="flex flex-col gap-1 px-2 pt-2">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-3 text-body-sm text-text-secondary hover:bg-accent/8',
                  currentTab === item.path && 'bg-accent/12 font-semibold text-accent'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
          <Separator className="mt-2" />
          <nav className="px-2 pt-2">
            <Link
              to="/settings"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 rounded-md px-3 py-3 text-body-sm text-text-secondary hover:bg-accent/8"
            >
              <SettingsIcon className="size-4.5" />
              {t('nav.settings')}
            </Link>
          </nav>
          <div className="mt-auto p-4">
            <div className="mb-4 flex items-center rounded-md bg-surface-raised p-4">
              <Avatar className="mr-3 size-10 border-2 border-accent/30">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-body-sm font-semibold">{user?.name}</p>
                <p className="truncate text-caption text-text-secondary">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                handleLogout()
                closeMobileMenu()
              }}
            >
              {t('auth.logout')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          'mx-auto w-full flex-1 px-4 py-4 sm:px-6 sm:py-6 md:py-8',
          currentTab === '/games' ? 'md:px-12' : 'max-w-7xl'
        )}
      >
        <Outlet />
      </div>

      <Footer />
    </div>
  )
}

export default Layout
