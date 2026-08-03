import { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type SettingsSectionTone = 'accent' | 'danger'

interface SettingsSectionProps {
  icon: ReactNode
  title: string
  description?: string
  tone?: SettingsSectionTone
  /** Supplied only by sections that fold away, which renders the header as a disclosure. */
  expanded?: boolean
  onToggle?: () => void
  children: ReactNode
}

const toneClasses: Record<SettingsSectionTone, { icon: string; title: string }> = {
  accent: { icon: 'text-accent', title: 'text-text-primary' },
  danger: { icon: 'text-destructive', title: 'text-destructive' },
}

/**
 * One block of the settings page, and the only place its vertical rhythm is defined.
 *
 * Each section used to space itself, and the results did not agree: an `mb-8` on the
 * wrapper plus a `my-8` on the rule after it put 32px of air below every divider and 64px
 * above it, while the two social sections at the top carried no divider at all and a
 * heading in a different weight. Owning the rule and the padding here makes that gap
 * symmetric by construction, and `first:` covers the sections that render nothing at all -
 * an unclaimed profile, an empty request list - without leaving a stray line behind.
 */
function SettingsSection({
  icon,
  title,
  description,
  tone = 'accent',
  expanded,
  onToggle,
  children,
}: SettingsSectionProps) {
  const classes = toneClasses[tone]

  const heading = (
    <>
      <span className={cn('mr-3 flex', classes.icon)}>{icon}</span>
      <p className={cn('flex-1 text-left text-h4 font-medium', classes.title)}>{title}</p>
    </>
  )

  return (
    <section className="border-t border-border pt-8 first:border-t-0 first:pt-0">
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="mb-2 flex min-h-11 w-full items-center transition-opacity duration-150 ease-standard hover:opacity-80"
        >
          {heading}
          {expanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
        </button>
      ) : (
        <div className="mb-2 flex items-center">{heading}</div>
      )}

      {description && <p className="mb-4 text-body-sm text-text-secondary">{description}</p>}

      {children}
    </section>
  )
}

export default SettingsSection
