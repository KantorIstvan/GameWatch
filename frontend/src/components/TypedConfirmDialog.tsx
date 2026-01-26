import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Slide,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import CloseIcon from '@mui/icons-material/Close'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

interface TypedConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | React.ReactNode
  confirmText: string
  /** The exact text the user must type to enable confirmation (case-sensitive) */
  requiredText: string
  cancelText?: string
  destructive?: boolean
}

/**
 * A confirmation dialog that requires the user to type exact text before confirming.
 * Follows the GitHub repository deletion pattern for critical destructive actions.
 * 
 * Example usage:
 * <TypedConfirmDialog
 *   open={open}
 *   onClose={handleClose}
 *   onConfirm={handleDelete}
 *   title="Delete Game"
 *   message="Are you sure you want to permanently delete this game? This will remove all associated data."
 *   confirmText="Delete"
 *   requiredText="Delete"
 *   destructive
 * />
 */
function TypedConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  requiredText,
  cancelText = 'Cancel',
  destructive = true,
}: TypedConfirmDialogProps) {
  const theme = useTheme()
  const [inputValue, setInputValue] = useState('')
  const isValid = inputValue === requiredText

  const handleClose = () => {
    setInputValue('')
    onClose()
  }

  const handleConfirm = () => {
    if (isValid) {
      setInputValue('')
      onConfirm()
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && isValid) {
      handleConfirm()
    }
  }

  const icon = destructive ? (
    <ErrorOutlineIcon sx={{ fontSize: 48 }} />
  ) : (
    <WarningAmberIcon sx={{ fontSize: 48 }} />
  )

  const color = destructive ? theme.palette.error.main : theme.palette.warning.main

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow:
            theme.palette.mode === 'dark'
              ? `0 8px 32px ${alpha('#000000', 0.6)}`
              : `0 8px 32px ${alpha('#000000', 0.15)}`,
          overflow: 'visible',
        },
      }}
    >
      <IconButton
        onClick={handleClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: 'text.secondary',
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ pt: 4, pb: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
          {/* Icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(color, 0.1),
              color: color,
              mb: 2,
            }}
          >
            {icon}
          </Box>

          {/* Title */}
          <DialogTitle sx={{ p: 0, mb: 1.5, fontSize: '1.5rem', fontWeight: 600 }}>
            {title}
          </DialogTitle>

          {/* Message */}
          <Typography
            color="text.secondary"
            sx={{
              mb: 3,
              lineHeight: 1.6,
              maxWidth: '90%',
            }}
          >
            {message}
          </Typography>

          {/* Instruction */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mb: 1,
              display: 'block',
              width: '100%',
              textAlign: 'left',
            }}
          >
            Please type <strong>{requiredText}</strong> to confirm
          </Typography>

          {/* Input Field */}
          <TextField
            fullWidth
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Type '${requiredText}' here`}
            autoFocus
            error={inputValue !== '' && !isValid}
            helperText={
              inputValue !== '' && !isValid
                ? `Please type '${requiredText}' exactly as shown`
                : ' '
            }
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontFamily: 'monospace',
                '&:hover fieldset': {
                  borderColor: destructive ? theme.palette.error.main : theme.palette.warning.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: destructive ? theme.palette.error.main : theme.palette.warning.main,
                },
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
        <Button onClick={handleClose} variant="outlined" fullWidth>
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!isValid}
          color={destructive ? 'error' : 'warning'}
          variant="contained"
          fullWidth
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TypedConfirmDialog
