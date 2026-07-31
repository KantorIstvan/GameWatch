import { Filter, Search, CircleCheck, CircleX, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface CalendarFiltersProps {
  mode: string
  statusFilter: string
  setStatusFilter: (filter: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

const accent = (mode: string) => (mode === 'light' ? '#667eea' : '#8b9af7')

export const CalendarFilters = ({
  mode,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
}: CalendarFiltersProps) => {
  const { t } = useTranslation()

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-1">
        <Filter className="size-5" style={{ color: accent(mode) }} />
        <p className="font-semibold" style={{ color: mode === 'light' ? '#495057' : '#adb5bd' }}>
          {t('calendar.filter', 'Filter')}
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: accent(mode) }} />
        <Input
          placeholder={t('calendar.searchPlaceholder', 'Search games...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          style={{ backgroundColor: mode === 'light' ? '#ffffff' : '#1a1d23' }}
        />
      </div>

      <ToggleGroup
        type="single"
        value={statusFilter}
        onValueChange={(v) => v && setStatusFilter(v)}
        variant="outline"
        className="flex-wrap justify-start gap-2"
      >
        <ToggleGroupItem
          value="all"
          className="rounded-md! border px-4 py-2 font-semibold data-[state=on]:text-white"
          style={
            statusFilter === 'all'
              ? { backgroundColor: accent(mode), borderColor: accent(mode) }
              : { color: accent(mode), borderColor: `${accent(mode)}33` }
          }
        >
          {t('calendar.all', 'All')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="completed"
          className="rounded-md! border px-4 py-2 font-semibold data-[state=on]:text-white"
          style={
            statusFilter === 'completed'
              ? { backgroundColor: mode === 'light' ? '#10b981' : '#34d399', borderColor: mode === 'light' ? '#10b981' : '#34d399' }
              : { color: mode === 'light' ? '#10b981' : '#34d399', borderColor: mode === 'light' ? '#10b98133' : '#34d39933' }
          }
        >
          <CircleCheck className="mr-1 size-4" />
          {t('calendar.completed', 'Completed')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="dropped"
          className="rounded-md! border px-4 py-2 font-semibold data-[state=on]:text-white"
          style={
            statusFilter === 'dropped'
              ? { backgroundColor: mode === 'light' ? '#f44336' : '#ef5350', borderColor: mode === 'light' ? '#f44336' : '#ef5350' }
              : { color: mode === 'light' ? '#f44336' : '#ef5350', borderColor: mode === 'light' ? '#f4433633' : '#ef535033' }
          }
        >
          <CircleX className="mr-1 size-4" />
          {t('calendar.dropped', 'Dropped')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="started"
          className="rounded-md! border px-4 py-2 font-semibold data-[state=on]:text-white"
          style={
            statusFilter === 'started'
              ? { backgroundColor: mode === 'light' ? '#f59e0b' : '#fbbf24', borderColor: mode === 'light' ? '#f59e0b' : '#fbbf24' }
              : { color: mode === 'light' ? '#f59e0b' : '#fbbf24', borderColor: mode === 'light' ? '#f59e0b33' : '#fbbf2433' }
          }
        >
          <Play className="mr-1 size-4" />
          {t('calendar.started', 'Started')}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
