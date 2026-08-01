import { Toaster as Sonner, ToasterProps } from 'sonner'
import { useTheme } from '@/contexts/ThemeContext'

function Toaster({ ...props }: ToasterProps) {
  const { mode } = useTheme()

  return (
    <Sonner
      theme={mode}
      className="toaster group"
      position="bottom-right"
      style={
        {
          '--normal-bg': 'var(--color-surface-raised)',
          '--normal-border': 'var(--color-border)',
          '--normal-text': 'var(--color-text-primary)',
          '--success-bg': 'var(--color-surface-raised)',
          '--success-border': 'var(--color-success)',
          '--success-text': 'var(--color-success)',
          '--error-bg': 'var(--color-surface-raised)',
          '--error-border': 'var(--color-danger)',
          '--error-text': 'var(--color-danger)',
          '--warning-bg': 'var(--color-surface-raised)',
          '--warning-border': 'var(--color-warning)',
          '--warning-text': 'var(--color-warning)',
          '--info-bg': 'var(--color-surface-raised)',
          '--info-border': 'var(--color-info)',
          '--info-text': 'var(--color-info)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'rounded-xl shadow-3 border',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
