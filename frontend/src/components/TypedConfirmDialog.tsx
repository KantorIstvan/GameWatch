import React, { useState } from 'react'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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
 */
function TypedConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  requiredText,
  cancelText,
  destructive = true,
}: TypedConfirmDialogProps) {
  const { t } = useTranslation()
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && isValid) {
      handleConfirm()
    }
  }

  const color = destructive ? 'var(--color-danger)' : 'var(--color-warning)'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="overflow-visible rounded-xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex flex-col items-center pt-2 text-center">
          <div
            className="mb-4 flex size-20 items-center justify-center rounded-full"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
          >
            {destructive ? <CircleAlert className="size-12" /> : <TriangleAlert className="size-12" />}
          </div>

          <p className="mb-3 text-h3 font-semibold">{title}</p>

          <p className="mb-6 max-w-full text-body text-text-secondary">{message}</p>

          <p className="mb-1 block w-full text-left text-caption text-text-secondary">
            {t('common.typeToConfirm', { text: requiredText })}
          </p>

          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('common.typePlaceholder', { text: requiredText })}
            autoFocus
            aria-invalid={inputValue !== '' && !isValid}
            className={cn('font-mono', inputValue !== '' && !isValid && 'border-destructive')}
          />
          <p className="mt-1 block w-full text-left text-caption text-destructive">
            {inputValue !== '' && !isValid
              ? t('common.typeMismatch', { text: requiredText })
              : ' '}
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleClose} variant="outline" className="flex-1">
            {cancelText ?? t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            variant={destructive ? 'destructive' : 'default'}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TypedConfirmDialog
