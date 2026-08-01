import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InfoCardProps {
  icon: ReactNode
  iconColor?: string
  iconForeground?: string
  title: string
  value: string | number
  subtitle?: string
  className?: string
}

function InfoCard({ icon, iconColor, iconForeground, title, value, subtitle, className }: InfoCardProps) {
  return (
    <div
      className={cn(
        'h-full rounded-xl border p-8 backdrop-blur-xl',
        iconColor ? 'border-current/20' : 'border-border bg-surface/60',
        className
      )}
      style={
        iconColor
          ? {
              color: iconColor,
              background: `linear-gradient(135deg, color-mix(in srgb, ${iconColor} 10%, transparent) 0%, color-mix(in srgb, ${iconColor} 5%, transparent) 100%)`,
            }
          : undefined
      }
    >
      <div className="mb-2 flex items-center">
        <div
          className={cn('mr-3 flex rounded-md p-2 shadow-2', !iconColor && 'bg-text-primary text-bg')}
          style={iconColor ? { backgroundColor: iconColor, color: iconForeground ?? '#ffffff' } : undefined}
        >
          {icon}
        </div>
        <h3 className="text-h4 font-bold text-text-primary">{title}</h3>
      </div>
      <p className="line-clamp-2 text-h3 font-bold text-text-primary">
        {value}
      </p>
      {subtitle && (
        <p className="mt-2 text-body-sm text-text-secondary">{subtitle}</p>
      )}
    </div>
  )
}

export default InfoCard
