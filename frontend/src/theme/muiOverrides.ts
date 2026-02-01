import { Components, Theme } from '@mui/material/styles'

/**
 * Design System - MUI Component Overrides
 * 
 * This file contains global style overrides for Material-UI components
 * to ensure consistency across the application.
 * 
 * Design Specifications:
 * - Card border-radius: 24px (borderRadius: 3)
 * - Input border-radius: 8px
 * - Button border-radius: 8px
 * - Card padding: 32px (p: 4)
 * - Border opacity: 0.1
 */

export const getMuiOverrides = (theme: Theme): Components<Theme> => ({
  // ========== CARD COMPONENTS ==========
  MuiCard: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        borderRadius: 24, // Unified card border radius
        border: `1px solid ${theme.palette.mode === 'light' 
          ? 'rgba(0, 0, 0, 0.1)' 
          : 'rgba(255, 255, 255, 0.1)'}`,
      },
    },
  },
  MuiPaper: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        // Only apply to cards, not dialogs or other paper components
        '&.MuiCard-root, &[data-card="true"]': {
          borderRadius: 24, // Unified card border radius
        },
      },
    },
  },

  // ========== INPUT COMPONENTS ==========
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8, // Unified input border radius
          transition: 'all 0.2s ease',
          '&:hover': {
            '& fieldset': {
              borderColor: theme.palette.mode === 'light'
                ? 'rgba(0, 0, 0, 0.4)'
                : 'rgba(255, 255, 255, 0.4)',
            },
          },
          '&.Mui-focused': {
            '& fieldset': {
              borderWidth: '2px',
            },
          },
        },
        '& .MuiInputBase-input': {
          padding: '12px 16px', // Consistent input padding
          fontSize: '14px',
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 8, // Unified input border radius
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderWidth: '2px',
        },
      },
      input: {
        padding: '12px 16px', // Consistent input padding
        fontSize: '14px',
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      select: {
        borderRadius: 8,
        padding: '12px 16px',
        fontSize: '14px',
      },
    },
  },
  MuiAutocomplete: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          padding: '4px 12px',
        },
      },
      listbox: {
        maxHeight: '250px',
      },
    },
  },

  // ========== BUTTON COMPONENTS ==========
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8, // Unified button border radius
        padding: '10px 24px',
        fontSize: '14px',
        fontWeight: 500,
        minHeight: 40,
        textTransform: 'none', // Remove uppercase transformation
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: theme.shadows[4],
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: theme.shadows[4],
        },
      },
      outlined: {
        borderWidth: '1.5px',
        '&:hover': {
          borderWidth: '1.5px',
        },
      },
      sizeSmall: {
        padding: '6px 16px',
        fontSize: '13px',
        minHeight: 32,
      },
      sizeLarge: {
        padding: '12px 32px',
        fontSize: '15px',
        minHeight: 48,
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 8, // Slight rounding for icon buttons
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'scale(1.05)',
        },
      },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        textTransform: 'none',
        fontSize: '14px',
        fontWeight: 500,
        padding: '8px 16px',
        transition: 'all 0.2s ease',
      },
    },
  },
  MuiToggleButtonGroup: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        '& .MuiToggleButton-root': {
          '&:first-of-type': {
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
          },
          '&:last-of-type': {
            borderTopRightRadius: 8,
            borderBottomRightRadius: 8,
          },
        },
      },
    },
  },

  // ========== DIALOG COMPONENTS ==========
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 24, // Match card border radius for consistency
      },
    },
  },

  // ========== CHIP COMPONENTS ==========
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontSize: '13px',
        fontWeight: 500,
      },
    },
  },
})

export default getMuiOverrides
