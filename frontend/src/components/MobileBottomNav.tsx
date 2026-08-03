import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface NavigationItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface MobileBottomNavProps {
  items: NavigationItem[]
  currentTab: string
  hidden?: boolean
}

function MobileBottomNav({ items, currentTab, hidden = false }: MobileBottomNavProps) {
  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] transition-transform duration-300 ease-standard md:hidden',
        hidden ? 'translate-y-full' : 'translate-y-0'
      )}
      aria-hidden={hidden}
    >
      <ul className="mx-auto flex max-w-100 items-stretch justify-between gap-1 rounded-xl border border-border bg-surface-raised/90 px-1.5 py-1.5 shadow-3 backdrop-blur-xl">
        {items.map((item) => {
          const isActive = currentTab === item.path
          return (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                tabIndex={hidden ? -1 : 0}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-text-secondary transition-colors duration-150 ease-standard',
                  isActive ? 'text-accent' : 'hover:text-text-primary'
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center rounded-lg px-3 py-0.5 transition-colors duration-150 ease-standard [&_svg]:size-5',
                    isActive && 'bg-accent-subtle'
                  )}
                >
                  {item.icon}
                </span>
                <span className={cn('text-caption leading-none', isActive && 'font-semibold')}>
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default MobileBottomNav
