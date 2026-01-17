import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Slide,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import React from 'react'
import CloseIcon from '@mui/icons-material/Close'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  confirmColor?: 'primary' | 'error' | 'warning' | 'success' | 'info' | 'secondary'
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

function ConfirmModal({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  confirmColor = 'primary' 
}: ConfirmModalProps) {
  const theme = useTheme()

  const getIconAndColor = () => {
    switch (confirmColor) {
      case 'error':
        return { 
          icon: <ErrorOutlineIcon sx={{ fontSize: 48 }} />, 
          color: theme.palette.error.main 
        }
      case 'warning':
        return { 
          icon: <WarningAmberIcon sx={{ fontSize: 48 }} />, 
          color: theme.palette.warning.main 
        }
      case 'success':
        return { 
          icon: <CheckCircleOutlineIcon sx={{ fontSize: 48 }} />, 
          color: theme.palette.success.main 
        }
      case 'info':
        return { 
          icon: <InfoOutlinedIcon sx={{ fontSize: 48 }} />, 
          color: theme.palette.info.main 
        }
      default:
        return { 
          icon: <HelpOutlineIcon sx={{ fontSize: 48 }} />, 
          color: theme.palette.primary.main 
        }
    }
  }

  const { icon, color } = getIconAndColor()

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: theme.palette.mode === 'dark' 
            ? `0 8px 32px ${alpha('#000000', 0.6)}` 
            : `0 8px 32px ${alpha('#000000', 0.15)}`,
          overflow: 'visible',
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
            : theme.palette.background.paper,
        }
      }}
    >
      {/* Close Button */}
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: theme.palette.text.secondary,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            transform: 'rotate(90deg)',
          }
        }}
      >
        <CloseIcon />
      </IconButton>

      {/* Icon Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pt: 4,
          pb: 2,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
            border: `2px solid ${alpha(color, 0.2)}`,
            color: color,
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                boxShadow: `0 0 0 0 ${alpha(color, 0.4)}`,
              },
              '50%': {
                boxShadow: `0 0 0 10px ${alpha(color, 0)}`,
              },
            },
          }}
        >
          {icon}
        </Box>
      </Box>

      {/* Title */}
      <DialogTitle 
        sx={{ 
          textAlign: 'center',
          pt: 2,
          pb: 1,
          px: 4,
          fontSize: '1.5rem',
          fontWeight: 600,
        }}
      >
        {title}
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ px: 4, pb: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          {typeof message === 'string' ? (
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ lineHeight: 1.6 }}
            >
              {message}
            </Typography>
          ) : (
            message
          )}
        </Box>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ px: 4, pb: 3, pt: 2, gap: 1.5 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          size="large"
          fullWidth
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            }
          }}
        >
          {cancelText}
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          color={confirmColor}
          size="large"
          fullWidth
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${alpha(color, 0.4)}`,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmModal
