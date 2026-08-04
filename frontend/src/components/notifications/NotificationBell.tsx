import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import NotificationRow from './NotificationRow'
import { useNotifications } from '../../hooks/useNotifications'

/**
 * Everything that happened, behind one icon.
 *
 * A single entry point rather than a badge per feature: someone wondering whether they
 * missed anything should have one place to look, and a follow request, a reply to a review
 * and a break reminder are all answers to that same question.
 *
 * Opening it marks everything read. Deliberately, rather than requiring a click per row -
 * the badge means "there is something you have not seen", and once the list is open, that
 * has stopped being true.
 */
function NotificationBell() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { items, unreadCount, loading, markAllRead, clear } = useNotifications()

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      markAllRead()
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? t('notifications.openWithCount', { count: unreadCount })
              : t('notifications.open')
          }
          className="relative size-11 text-text-secondary hover:text-accent md:size-9"
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            // A dot with a number, not a full badge component: it sits on the icon rather
            // than beside it, and nothing about it is interactive.
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-caption font-semibold leading-4 text-accent-foreground md:right-0.5 md:top-0.5"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-88 p-0">
        <div className="flex items-center justify-between gap-2 p-3">
          <p className="text-body-sm font-semibold text-text-primary">
            {t('notifications.title')}
          </p>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="text-text-secondary hover:text-accent"
            >
              {t('notifications.clearAll')}
            </Button>
          )}
        </div>

        <Separator />

        {loading && items.length === 0 ? (
          <p className="p-6 text-center text-body-sm text-text-secondary">
            {t('common.loading')}
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <BellOff className="size-6 text-text-secondary" />
            <p className="text-body-sm text-text-secondary">{t('notifications.empty')}</p>
          </div>
        ) : (
          // Capped rather than growing with the list: a dropdown taller than the window
          // cannot be closed by clicking away from it.
          <ScrollArea className="max-h-96">
            <ul className="flex flex-col gap-1 p-2">
              {items.map((item) => (
                <NotificationRow
                  key={`${item.source}:${item.id}`}
                  item={item}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default NotificationBell
