import { CalendarDays, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface CalendarToolbarProps {
  mode: string
  viewMode: 'calendar' | 'list'
  setViewMode: (mode: 'calendar' | 'list') => void
  isMobile: boolean
}

export const CalendarToolbar = ({ mode, viewMode, setViewMode, isMobile }: CalendarToolbarProps) => {
  const { t } = useTranslation()
  const accent = mode === 'light' ? '#667eea' : '#8b9af7'

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
      <h1 className="text-h2 font-medium" style={{ color: mode === 'light' ? '#212529' : '#ffffff' }}>
        {t('calendar.title')}
      </h1>

      {isMobile && (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setViewMode('list')}
            style={
              viewMode === 'list'
                ? { backgroundColor: accent, color: '#ffffff' }
                : { backgroundColor: `${accent}1a`, color: accent }
            }
          >
            <List className="size-4.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setViewMode('calendar')}
            style={
              viewMode === 'calendar'
                ? { backgroundColor: accent, color: '#ffffff' }
                : { backgroundColor: `${accent}1a`, color: accent }
            }
          >
            <CalendarDays className="size-4.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
