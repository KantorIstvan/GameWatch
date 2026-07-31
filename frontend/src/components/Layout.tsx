import { useAuth0 } from '@auth0/auth0-react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Settings as SettingsIcon, Timer, BarChart, Gamepad2, CalendarDays, Heart, CircleHelp, LogOut, ChevronsUpDown } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import Footer from './Footer'

function Layout() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0()
  const { mode, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const location = useLocation()
  const currentTab = location.pathname === '/statistics' ? '/statistics' : location.pathname.startsWith('/games') ? '/games' : location.pathname === '/calendar' ? '/calendar' : location.pathname === '/health' ? '/health' : '/'

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } })
  }

  const navigationItems = [
    { label: t('nav.timers'), path: '/', icon: <Timer /> },
    { label: t('nav.statistics'), path: '/statistics', icon: <BarChart /> },
    { label: t('nav.myGames'), path: '/games', icon: <Gamepad2 /> },
    { label: t('nav.calendar'), path: '/calendar', icon: <CalendarDays /> },
    { label: t('nav.health'), path: '/health', icon: <Heart /> },
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
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
            <p className="truncate bg-linear-to-br from-brand-start to-brand-end bg-clip-text text-h4 font-semibold tracking-tight text-transparent">
              {t('app.name')}
            </p>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={currentTab === item.path} tooltip={item.label}>
                      <Link to={item.path}>
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarSeparator className="mx-0 mb-2" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton className="h-auto py-1.5">
                <Avatar className="size-7 shrink-0 border border-border">
                  <AvatarImage src={user?.picture} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-body-sm font-medium text-text-primary">{user?.name}</p>
                  <p className="truncate text-caption text-text-secondary">{user?.email}</p>
                </div>
                <ChevronsUpDown className="size-4 shrink-0 text-text-secondary group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="min-w-56">
              <DropdownMenuLabel className="font-medium">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme}>
                {mode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {mode === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
              </DropdownMenuItem>
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
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="size-4" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/60 bg-bg/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <SidebarTrigger />
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-text-secondary transition-transform hover:rotate-20 hover:text-accent"
          >
            {mode === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
          </Button>
        </header>

        <div
          className={cn(
            'mx-auto w-full flex-1 px-4 py-4 sm:px-6 sm:py-6 md:py-8',
            currentTab === '/games' ? 'md:px-12' : 'max-w-7xl'
          )}
        >
          <Outlet />
        </div>

        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
