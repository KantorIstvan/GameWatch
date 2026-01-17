import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import CssBaseline from '@mui/material/CssBaseline'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  mode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('theme-mode')
    return (savedMode as ThemeMode) || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('theme-mode', mode)
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  const toggleTheme = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light')
  }

  const theme = useMemo(
    () =>
      createTheme({
        direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light Mode
                primary: {
                  main: '#343a40', // gunmetal
                  light: '#495057', // iron-grey
                  dark: '#212529', // carbon-black
                  contrastText: '#f8f9fa', // bright-snow
                },
                secondary: {
                  main: '#6c757d', // slate-grey
                  light: '#adb5bd', // pale-slate-2
                  dark: '#495057', // iron-grey
                  contrastText: '#f8f9fa', // bright-snow
                },
                background: {
                  default: '#f8f9fa', // bright-snow
                  paper: '#ffffff',
                },
                text: {
                  primary: '#212529', // carbon-black
                  secondary: '#495057', // iron-grey
                },
                divider: '#dee2e6', // alabaster-grey
              }
            : {
                // Dark Mode
                primary: {
                  main: '#adb5bd', // pale-slate-2
                  light: '#ced4da', // pale-slate
                  dark: '#6c757d', // slate-grey
                  contrastText: '#000000', // pure black
                },
                secondary: {
                  main: '#6c757d', // slate-grey
                  light: '#adb5bd', // pale-slate-2
                  dark: '#343a40', // gunmetal
                  contrastText: '#f8f9fa', // bright-snow
                },
                background: {
                  default: '#0a0c0e', // darker than carbon-black
                  paper: '#212529', // carbon-black
                },
                text: {
                  primary: '#f8f9fa', // bright-snow
                  secondary: '#adb5bd', // pale-slate-2
                },
                divider: '#343a40', // gunmetal
              }),
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'light' ? '#ffffff' : '#212529',
                color: mode === 'light' ? '#212529' : '#f8f9fa',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'light' ? '#ffffff' : '#212529',
                borderColor: mode === 'light' ? '#dee2e6' : '#343a40',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              outlined: {
                borderColor: mode === 'light' ? '#ced4da' : '#6c757d',
                '&:hover': {
                  borderColor: mode === 'light' ? '#6c757d' : '#adb5bd',
                  backgroundColor: mode === 'light' ? 'rgba(52, 58, 64, 0.04)' : 'rgba(173, 181, 189, 0.08)',
                },
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: mode === 'light' ? '#ced4da' : '#6c757d',
                  },
                },
              },
            },
          },
        },
      }),
    [mode, i18n.language]
  )

  const value = {
    mode,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
