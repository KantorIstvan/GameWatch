import React from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: string
  foreground?: string
  hero?: boolean
  className?: string
}

const StatCard = React.memo(({ title, value, icon, color, foreground, hero = false, className }: StatCardProps) => {
  const resolvedColor = color ?? (hero ? 'var(--color-accent)' : undefined)

  return (
    <div
      className={cn(
        'flex h-full flex-col justify-center rounded-xl border p-6',
        hero ? 'sm:p-8' : 'p-5',
        resolvedColor ? 'border-current/20' : 'border-border bg-surface/60 backdrop-blur-xl',
        className
      )}
      style={
        resolvedColor
          ? {
              color: resolvedColor,
              background: `linear-gradient(135deg, color-mix(in srgb, ${resolvedColor} 10%, transparent) 0%, color-mix(in srgb, ${resolvedColor} 5%, transparent) 100%)`,
            }
          : undefined
      }
    >
      <div className="mb-2 flex items-center">
        <div
          className={cn(
            'mr-3 flex rounded-md shadow-2',
            hero ? 'p-3' : 'p-2',
            !resolvedColor && 'bg-text-primary text-bg'
          )}
          style={resolvedColor ? { backgroundColor: resolvedColor, color: foreground ?? '#ffffff' } : undefined}
        >
          {icon}
        </div>
        <p className="text-body-sm font-medium text-text-secondary">{title}</p>
      </div>
      <p className={cn('font-bold leading-tight text-text-primary', hero ? 'text-display' : 'text-h3 sm:text-h1')}>
        {value}
      </p>
    </div>
  )
})

StatCard.displayName = 'StatCard'

export default StatCard
