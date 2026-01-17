import React, { useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  alpha,
  useTheme,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { Slide } from '@mui/material'
import { Close } from '@mui/icons-material'

interface StyledDialogProps {
  open: boolean
  onClose: () => void
  title: string
  icon: React.ReactNode
  iconColor?: string
  children: React.ReactNode
  actions?: React.ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

const StyledDialog = React.memo(({ 
  open, 
  onClose, 
  title, 
  icon, 
  iconColor,
  children, 
  actions,
  maxWidth = 'sm',
  fullWidth = true 
}: StyledDialogProps) => {
  const theme = useTheme()
  
  const computedIconColor = useMemo(() => 
    iconColor || theme.palette.primary.main, 
    [iconColor, theme.palette.primary.main]
  )
  
  const paperSx = useMemo(() => ({
    borderRadius: { xs: 2, sm: 3 },
    boxShadow: theme.palette.mode === 'dark' 
      ? `0 8px 32px ${alpha('#000000', 0.6)}` 
      : `0 8px 32px ${alpha('#000000', 0.15)}`,
    overflow: 'visible',
    m: { xs: 2, sm: 3 },
    maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
    background: theme.palette.mode === 'dark'
      ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
      : theme.palette.background.paper,
  }), [theme.palette.mode, theme.palette.background.paper])
  
  const iconBoxSx = useMemo(() => ({
    width: { xs: 64, sm: 80 },
    height: { xs: 64, sm: 80 },
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${alpha(computedIconColor, 0.1)} 0%, ${alpha(computedIconColor, 0.05)} 100%)`,
    border: `2px solid ${alpha(computedIconColor, 0.2)}`,
    color: computedIconColor,
    animation: 'pulse 2s ease-in-out infinite',
    '@keyframes pulse': {
      '0%, 100%': {
        boxShadow: `0 0 0 0 ${alpha(computedIconColor, 0.4)}`,
      },
      '50%': {
        boxShadow: `0 0 0 10px ${alpha(computedIconColor, 0)}`,
      },
    },
  }), [computedIconColor])
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={maxWidth} 
      fullWidth={fullWidth}
      fullScreen={false}
      TransitionComponent={Transition}
      PaperProps={{ sx: paperSx }}
    >
      {/* Close Button */}
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: { xs: 4, sm: 8 },
          top: { xs: 4, sm: 8 },
          color: theme.palette.text.secondary,
          transition: 'all 0.2s ease-in-out',
          minWidth: 44,
          minHeight: 44,
          '&:hover': {
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            transform: 'rotate(90deg)',
          }
        }}
      >
        <Close />
      </IconButton>

      {/* Icon Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pt: { xs: 3, sm: 4 },
          pb: 2,
        }}
      >
        <Box sx={iconBoxSx}>
          {icon}
        </Box>
      </Box>

      <DialogTitle 
        sx={{ 
          textAlign: 'center',
          pt: 2,
          pb: 1,
          px: { xs: 2, sm: 3, md: 4 },
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 600,
        }}
      >
        {title}
      </DialogTitle>
      
      <DialogContent sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: 2 }}>
        {children}
      </DialogContent>
      
      {actions && (
        <DialogActions sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: 3, pt: 2, gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  )
})

StyledDialog.displayName = 'StyledDialog'

export default StyledDialog
