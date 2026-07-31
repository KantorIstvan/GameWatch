import React from 'react'
import { CircleAlert, TriangleAlert, CircleCheck, Info, CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

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

const colorMap: Record<NonNullable<ConfirmModalProps['confirmColor']>, string> = {
  primary: 'var(--color-accent)',
  secondary: 'var(--color-text-secondary)',
  error: 'var(--color-danger)',
  warning: '#ed6c02',
  success: 'var(--color-success)',
  info: '#0288d1',
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'primary',
}: ConfirmModalProps) {
  const getIcon = () => {
    switch (confirmColor) {
      case 'error':
        return <CircleAlert className="size-12" />
      case 'warning':
        return <TriangleAlert className="size-12" />
      case 'success':
        return <CircleCheck className="size-12" />
      case 'info':
        return <Info className="size-12" />
      default:
        return <CircleHelp className="size-12" />
    }
  }

  const color = colorMap[confirmColor]

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="overflow-visible rounded-xl">
        <div className="flex justify-center pb-2 pt-2">
          <div
            className="flex size-20 items-center justify-center rounded-full border-2"
            style={{
              color,
              borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
              background: `linear-gradient(135deg, color-mix(in srgb, ${color} 10%, transparent) 0%, color-mix(in srgb, ${color} 5%, transparent) 100%)`,
            }}
          >
            {getIcon()}
          </div>
        </div>

        <DialogTitle className="pb-1 text-center text-h3 font-semibold">
          {title}
        </DialogTitle>

        <div className="text-center">
          {typeof message === 'string' ? (
            <p className="text-body text-text-secondary">{message}</p>
          ) : (
            message
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button onClick={onClose} variant="outline" size="lg" className="flex-1">
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            size="lg"
            className="flex-1 text-white"
            style={{ backgroundColor: color }}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmModal
