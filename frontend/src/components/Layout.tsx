import { useAuth0 } from '@auth0/auth0-react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box, Container, Avatar, Menu, MenuItem, IconButton, Tabs, Tab, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, useMediaQuery } from '@mui/material'
import { Brightness4, Brightness7, Settings as SettingsIcon, Menu as MenuIcon, Timer, BarChart, VideogameAsset, CalendarMonth, Close, Favorite } from '@mui/icons-material'
import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

function Layout() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0()
  const { mode, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
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

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } })
    handleClose()
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const navigationItems = [
    { label: t('nav.timers'), path: '/', icon: <Timer /> },
    { label: t('nav.statistics'), path: '/statistics', icon: <BarChart /> },
    { label: t('nav.myGames'), path: '/games', icon: <VideogameAsset /> },
    { label: t('nav.calendar'), path: '/calendar', icon: <CalendarMonth /> },
    { label: 'Health', path: '/health', icon: <Favorite /> },
  ]

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: mode === 'light' ? '#f8f9fa' : '#0a0c0e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <IconButton
          onClick={toggleTheme}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: mode === 'light' ? '#212529' : '#f8f9fa',
          }}
        >
          {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
        <Container maxWidth="sm">
          <Box
            sx={{
              textAlign: 'center',
              animation: 'fadeIn 0.8s ease-out',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateY(20px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontSize: { xs: '3rem', md: '4rem' },
                fontWeight: 300,
                color: mode === 'light' ? '#212529' : '#ffffff',
                mb: 2,
                letterSpacing: '0.05em',
              }}
            >
              {t('app.name')}
            </Typography>
            
            <Typography
              variant="h6"
              sx={{
                color: mode === 'light' ? '#6c757d' : '#666666',
                fontWeight: 300,
                mb: 6,
                letterSpacing: '0.02em',
              }}
            >
              {t('app.tagline')}
            </Typography>

            <Button
              variant="outlined"
              size="large"
              onClick={() => loginWithRedirect({
                authorizationParams: {
                  prompt: 'select_account'
                }
              })}
              sx={{
                px: 6,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 400,
                color: mode === 'light' ? '#212529' : '#ffffff',
                borderColor: mode === 'light' ? '#ced4da' : '#333333',
                borderWidth: 1,
                letterSpacing: '0.05em',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: mode === 'light' ? '#212529' : '#ffffff',
                  bgcolor: mode === 'light' ? 'rgba(33, 37, 41, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              {t('auth.login')}
            </Button>
          </Box>
        </Container>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          top: 0,
          transform: showNavbar ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'all 0.3s ease-in-out',
          backdropFilter: 'blur(20px) saturate(180%)',
          backgroundColor: mode === 'light' 
            ? 'rgba(255, 255, 255, 0.72)' 
            : 'rgba(10, 12, 14, 0.72)',
          borderBottom: '1px solid',
          borderColor: mode === 'light' 
            ? 'rgba(0, 0, 0, 0.08)' 
            : 'rgba(255, 255, 255, 0.08)',
          boxShadow: mode === 'light'
            ? '0 2px 16px rgba(0, 0, 0, 0.04)'
            : '0 2px 16px rgba(0, 0, 0, 0.2)',
        }}
      >
        <Toolbar sx={{ py: 1, px: { xs: 2, sm: 3 } }}>
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 500,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              letterSpacing: '-0.5px',
              background: mode === 'light'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('app.name')}
          </Typography>
          {!isMobile && (
            <Tabs 
              value={currentTab} 
              textColor="inherit" 
              sx={{ 
                mr: 3,
                '& .MuiTab-root': {
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  minWidth: 100,
                  color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-selected': {
                    color: mode === 'light' ? '#667eea' : '#8b9af7',
                  },
                  '&:hover': {
                    color: mode === 'light' ? '#667eea' : '#8b9af7',
                  backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
                },
                transition: 'all 0.2s ease',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: mode === 'light' ? '#667eea' : '#8b9af7',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab label={t('nav.timers')} value="/" component={Link} to="/" />
            <Tab label={t('nav.statistics')} value="/statistics" component={Link} to="/statistics" />
            <Tab label={t('nav.myGames')} value="/games" component={Link} to="/games" />
            <Tab label={t('nav.calendar')} value="/calendar" component={Link} to="/calendar" />
            <Tab label="Health" value="/health" component={Link} to="/health" />
          </Tabs>
          )}
          {isMobile && (
            <IconButton
              onClick={toggleMobileMenu}
              sx={{ 
                mr: 1.5,
                color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: mode === 'light' ? '#667eea' : '#8b9af7',
                  backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <IconButton
            onClick={toggleTheme}
            sx={{ 
              mr: 1.5,
              color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s ease',
              '&:hover': {
                color: mode === 'light' ? '#667eea' : '#8b9af7',
                backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
                transform: 'rotate(20deg)',
              },
            }}
          >
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton
            onClick={handleMenu}
            sx={{
              p: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            <Avatar 
              src={user?.picture} 
              alt={user?.name}
              sx={{
                width: 38,
                height: 38,
                border: '2px solid',
                borderColor: mode === 'light' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(139, 154, 247, 0.3)',
              }}
            />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 1.5,
                minWidth: 200,
                borderRadius: 2,
                backdropFilter: 'blur(20px)',
                backgroundColor: mode === 'light' 
                  ? 'rgba(255, 255, 255, 0.9)' 
                  : 'rgba(33, 37, 41, 0.9)',
                border: '1px solid',
                borderColor: mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.08)' 
                  : 'rgba(255, 255, 255, 0.08)',
                boxShadow: mode === 'light'
                  ? '0 8px 32px rgba(0, 0, 0, 0.08)'
                  : '0 8px 32px rgba(0, 0, 0, 0.3)',
                '& .MuiMenuItem-root': {
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                  '&:hover': {
                    backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
                  },
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{user?.email}</Typography>
            </MenuItem>
            <MenuItem component={Link} to="/settings" onClick={handleClose}>
              <SettingsIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
              {t('nav.settings')}
            </MenuItem>
            <MenuItem onClick={handleLogout}>{t('auth.logout')}</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            backdropFilter: 'blur(20px)',
            backgroundColor: mode === 'light' 
              ? 'rgba(255, 255, 255, 0.95)' 
              : 'rgba(10, 12, 14, 0.95)',
            borderRight: '1px solid',
            borderColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.08)' 
              : 'rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 500,
              background: mode === 'light'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('app.name')}
          </Typography>
          <IconButton 
            onClick={closeMobileMenu}
            sx={{
              color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            }}
          >
            <Close />
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ pt: 2 }}>
          {navigationItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={closeMobileMenu}
                selected={currentTab === item.path}
                sx={{
                  py: 1.5,
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.12)' : 'rgba(139, 154, 247, 0.12)',
                    color: mode === 'light' ? '#667eea' : '#8b9af7',
                    '& .MuiListItemIcon-root': {
                      color: mode === 'light' ? '#667eea' : '#8b9af7',
                    },
                  },
                  '&:hover': {
                    backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: currentTab === item.path ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ mt: 2 }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/settings"
              onClick={closeMobileMenu}
              sx={{
                py: 1.5,
                mx: 1,
                mb: 0.5,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                }}
              >
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary={t('nav.settings')} />
            </ListItemButton>
          </ListItem>
        </List>
        <Box sx={{ mt: 'auto', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, borderRadius: 2, bgcolor: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)' }}>
            <Avatar 
              src={user?.picture} 
              alt={user?.name}
              sx={{
                width: 40,
                height: 40,
                mr: 2,
                border: '2px solid',
                borderColor: mode === 'light' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(139, 154, 247, 0.3)',
              }}
            />
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {user?.email}
              </Typography>
            </Box>
          </Box>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              handleLogout()
              closeMobileMenu()
            }}
            sx={{
              borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
              color: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
              '&:hover': {
                borderColor: mode === 'light' ? '#667eea' : '#8b9af7',
                backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.08)' : 'rgba(139, 154, 247, 0.08)',
              },
            }}
          >
            {t('auth.logout')}
          </Button>
        </Box>
      </Drawer>

      <Container 
        maxWidth={currentTab === '/games' ? false : 'xl'} 
        sx={{ 
          mt: { xs: 2, sm: 3, md: 4 }, 
          mb: { xs: 2, sm: 3, md: 4 }, 
          px: { xs: 2, sm: 3, md: 3 },
          flex: 1,
          ...(currentTab === '/games' && { px: { xs: 2, sm: 3, md: 6 } })
        }}
      >
        <Outlet />
      </Container>
    </Box>
  )
}

export default Layout
