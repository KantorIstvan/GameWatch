import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InfoCardProps {
  icon: ReactNode
  iconColor: string
  title: string
  value: string | number
  subtitle?: string
}

function InfoCard({ icon, iconColor, title, value, subtitle }: InfoCardProps) {
  return (
    <div className="h-full rounded-xl border border-border bg-surface/60 p-8 backdrop-blur-xl">
      <div className="mb-2 flex items-center">
        <div className="mr-2" style={{ color: iconColor }}>
          {icon}
        </div>
        <h3 className="text-h4 font-bold">{title}</h3>
      </div>
      <p
        className={cn('line-clamp-2 text-h3 font-bold')}
        style={{ color: iconColor }}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-2 text-body-sm text-text-secondary">{subtitle}</p>
      )}
    </div>
  )
}

export default InfoCard
