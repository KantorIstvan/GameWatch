import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  icon: ReactNode
  title: string
  className?: string
}

/**
 * Same icon-chip + title scaffold above every major section of the Statistics page
 * (Overview, Consistency, Trends, Backlog, Charts, Recommendations, Records) so scanning
 * down the page reads as a sequence of distinct, labeled groups instead of one
 * undifferentiated wall of cards - hierarchy through a consistent structural cue that
 * repeats, rather than a one-off treatment invented per section.
 */
function SectionHeader({ icon, title, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-center gap-3 border-b border-border pb-3 sm:mb-5', className)}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-text-primary text-bg shadow-2">
        {icon}
      </div>
      <p className="text-body-lg font-bold text-text-primary">{title}</p>
    </div>
  )
}

export default SectionHeader
