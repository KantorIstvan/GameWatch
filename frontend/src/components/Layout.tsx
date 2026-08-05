import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Settings as SettingsIcon, Timer, BarChart, Gamepad2, Library, GanttChart, Heart, CircleHelp, LogOut, ChevronsUpDown, Search, Rss, UsersRound, UserRound } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import MobileBottomNav from './MobileBottomNav'
import NotificationBell from './notifications/NotificationBell'

// Deep, single-purpose screens: full-focus mode on mobile — bottom nav and
// account entry point hide the same way opening an editor hides chrome in a
// notes app, since these pages already carry their own back navigation.
const isFocusRoute = (pathname: string) =>
  /^\/playthrough\/\d+/.test(pathname) ||
  /^\/games\/\d+\/statistics/.test(pathname) ||
  /^\/catalog\/\d+/.test(pathname)

function Layout() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0()
  const { mode, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const location = useLocation()
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const currentTab = location.pathname === '/statistics' ? '/statistics' : location.pathname.startsWith('/games') ? '/games' : location.pathname.startsWith('/catalog') ? '/catalog' : location.pathname === '/timeline' ? '/timeline' : location.pathname === '/health' ? '/health' : '/'
  const focusMode = isFocusRoute(location.pathname)

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } })
  }

  const navigationItems = [
    { label: t('nav.timers'), path: '/', icon: <Timer /> },
    { label: t('nav.statistics'), path: '/statistics', icon: <BarChart /> },
    { label: t('nav.myGames'), path: '/games', icon: <Gamepad2 /> },
    { label: t('nav.catalog'), path: '/catalog', icon: <Library /> },
    { label: t('nav.calendar'), path: '/timeline', icon: <GanttChart /> },
    { label: t('nav.health'), path: '/health', icon: <Heart /> },
  ]

  // Kept separate from navigationItems: these do not appear in the mobile bottom bar,
  // which is reserved for the five core tracking tabs above.
  const socialItems = [
    { label: t('nav.people'), path: '/people', icon: <Search className="size-4.5" /> },
    { label: t('feed.title'), path: '/feed', icon: <Rss className="size-4.5" /> },
    { label: t('groups.title'), path: '/groups', icon: <UsersRound className="size-4.5" /> },
  ]

  if (!isAuthenticated) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-bg">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={t('theme.toggle')}
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
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t('nav.social')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {socialItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname.startsWith(item.path)}
                      tooltip={item.label}
                    >
                      <Link to={item.path}>
                        {item.icon}
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
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
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserRound className="size-4" />
                  {t('nav.profile')}
                </Link>
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
          <SidebarTrigger className="hidden md:inline-flex" />

          <Link to="/" className="flex items-center gap-2 md:hidden">
            <p className="truncate bg-linear-to-br from-brand-start to-brand-end bg-clip-text text-h4 font-semibold tracking-tight text-transparent">
              {t('app.name')}
            </p>
          </Link>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label={t('nav.people')}
            className="size-11 text-text-secondary hover:text-accent md:size-9"
          >
            <Link to="/people">
              <Search className="size-4.5" />
            </Link>
          </Button>

          <NotificationBell />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={t('theme.toggle')}
            className="size-11 text-text-secondary transition-transform hover:rotate-20 hover:text-accent md:size-9"
          >
            {mode === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
          </Button>

          {!focusMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAccountSheetOpen(true)}
              className="size-11 md:hidden"
              aria-label={t('nav.account')}
            >
              <Avatar className="size-7 shrink-0 border border-border">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            </Button>
          )}
        </header>

        <div
          className={cn(
            'mx-auto w-full flex-1 px-4 pt-4 sm:px-6 sm:pt-6 md:pt-8',
            focusMode ? 'pb-4 md:pb-8' : 'pb-24 md:pb-8',
            // Only the library's cover grid earns the full width; everything else, the
            // catalog's search results included, reads better measured.
            currentTab === '/games' ? 'md:px-12' : 'max-w-7xl'
          )}
        >
          <Outlet />
        </div>

        <Footer />
        {!focusMode && <div className="h-20 md:hidden" aria-hidden="true" />}
      </SidebarInset>

      <MobileBottomNav items={navigationItems} currentTab={currentTab} hidden={focusMode} />

      <Sheet open={accountSheetOpen} onOpenChange={setAccountSheetOpen}>
        <SheetContent side="bottom" className="md:hidden">
          <SheetHeader className="flex-row items-center gap-3 text-left">
            <Avatar className="size-11 shrink-0 border border-border">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-body font-semibold">{user?.name}</SheetTitle>
              <SheetDescription className="truncate">{user?.email}</SheetDescription>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-1 px-4 pb-2">
            {socialItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                asChild
                className="h-12 justify-start gap-3 text-body"
                onClick={() => setAccountSheetOpen(false)}
              >
                <Link to={item.path}>
                  {item.icon}
                  {item.label}
                </Link>
              </Button>
            ))}
            <SidebarSeparator className="mx-0 my-1" />
            <Button
              variant="ghost"
              asChild
              className="h-12 justify-start gap-3 text-body"
              onClick={() => setAccountSheetOpen(false)}
            >
              <Link to="/profile">
                <UserRound className="size-4.5" />
                {t('nav.profile')}
              </Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              className="h-12 justify-start gap-3 text-body"
              onClick={() => setAccountSheetOpen(false)}
            >
              <Link to="/settings">
                <SettingsIcon className="size-4.5" />
                {t('nav.settings')}
              </Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              className="h-12 justify-start gap-3 text-body"
              onClick={() => setAccountSheetOpen(false)}
            >
              <Link to="/help">
                <CircleHelp className="size-4.5" />
                {t('footer.help')}
              </Link>
            </Button>
            <SidebarSeparator className="mx-0 my-1" />
            <Button
              variant="ghost"
              className="h-12 justify-start gap-3 text-body text-destructive hover:text-destructive"
              onClick={() => {
                setAccountSheetOpen(false)
                handleLogout()
              }}
            >
              <LogOut className="size-4.5" />
              {t('auth.logout')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  )
}

export default Layout
