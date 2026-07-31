import React from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: string
}

const StatCard = React.memo(({ title, value, icon, color }: StatCardProps) => {
  return (
    <div
      className={cn(
        'h-full rounded-xl border p-8',
        color ? 'border-current/20' : 'border-border bg-surface/60 backdrop-blur-xl'
      )}
      style={
        color
          ? {
              color,
              background: `linear-gradient(135deg, color-mix(in srgb, ${color} 10%, transparent) 0%, color-mix(in srgb, ${color} 5%, transparent) 100%)`,
            }
          : undefined
      }
    >
      <div className="mb-2 flex items-center">
        <div
          className="mr-3 flex rounded-md p-2 text-white shadow-2"
          style={{ backgroundColor: color ?? 'var(--color-accent)' }}
        >
          {icon}
        </div>
        <p className="text-body-sm font-medium text-text-secondary">{title}</p>
      </div>
      <p
        className="text-h1 font-bold"
        style={{ color: color ?? 'var(--color-accent)' }}
      >
        {value}
      </p>
    </div>
  )
})

StatCard.displayName = 'StatCard'

export default StatCard
