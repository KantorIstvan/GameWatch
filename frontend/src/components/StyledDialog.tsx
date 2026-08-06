import React, { useMemo } from 'react'
import { Dialog, DialogBody, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface StyledDialogProps {
  open: boolean
  onClose: () => void
  title: string
  icon: React.ReactNode
  iconColor?: string
  children: React.ReactNode
  actions?: React.ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  fullWidth?: boolean
}

const maxWidthClass: Record<NonNullable<StyledDialogProps['maxWidth']>, string> = {
  xs: 'sm:max-w-xs',
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
}

const StyledDialog = React.memo(({
  open,
  onClose,
  title,
  icon,
  iconColor,
  children,
  actions,
  maxWidth = 'sm',
}: StyledDialogProps) => {
  const computedIconColor = useMemo(() => iconColor || 'var(--color-accent)', [iconColor])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col overflow-hidden rounded-xl sm:rounded-xl',
          maxWidthClass[maxWidth]
        )}
      >
        <div className="flex shrink-0 justify-center pb-2 pt-2">
          <div
            className="flex size-16 items-center justify-center rounded-full border-2 sm:size-20"
            style={{
              color: computedIconColor,
              borderColor: `color-mix(in srgb, ${computedIconColor} 20%, transparent)`,
              background: `linear-gradient(135deg, color-mix(in srgb, ${computedIconColor} 10%, transparent) 0%, color-mix(in srgb, ${computedIconColor} 5%, transparent) 100%)`,
            }}
          >
            {icon}
          </div>
        </div>

        <DialogTitle className="shrink-0 pb-1 text-center text-h4 font-semibold sm:text-h3">
          {title}
        </DialogTitle>

        <DialogBody className="px-0 pb-2">{children}</DialogBody>

        {actions && (
          <div className="flex shrink-0 flex-col gap-3 pb-1 pt-2">{actions}</div>
        )}
      </DialogContent>
    </Dialog>
  )
})

StyledDialog.displayName = 'StyledDialog'

export default StyledDialog
