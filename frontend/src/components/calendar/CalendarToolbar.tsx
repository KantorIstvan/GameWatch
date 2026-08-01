import { CalendarDays, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface CalendarToolbarProps {
  viewMode: 'calendar' | 'list'
  setViewMode: (mode: 'calendar' | 'list') => void
  isMobile: boolean
}

export const CalendarToolbar = ({ viewMode, setViewMode, isMobile }: CalendarToolbarProps) => {
  const { t } = useTranslation()

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
      <h1 className="text-h2 font-medium text-text-primary">{t('calendar.title')}</h1>

      {isMobile && (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant={viewMode === 'list' ? 'default' : 'secondary'}
            onClick={() => setViewMode('list')}
            aria-label={t('calendar.listView')}
          >
            <List className="size-4.5" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === 'calendar' ? 'default' : 'secondary'}
            onClick={() => setViewMode('calendar')}
            aria-label={t('calendar.calendarView')}
          >
            <CalendarDays className="size-4.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
