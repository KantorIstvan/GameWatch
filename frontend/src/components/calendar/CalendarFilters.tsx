import { Filter, Search, CircleCheck, CircleX, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface CalendarFiltersProps {
  statusFilter: string
  setStatusFilter: (filter: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const CalendarFilters = ({
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
}: CalendarFiltersProps) => {
  const { t } = useTranslation()

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-1">
        <Filter className="size-5 text-accent" />
        <p className="font-semibold text-text-secondary">{t('calendar.filter')}</p>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-accent" />
        <Input
          placeholder={t('calendar.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
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
          className="rounded-md! border border-border px-4 py-2 font-semibold text-text-secondary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:border-accent"
        >
          {t('calendar.all')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="completed"
          className="rounded-md! border border-success/20 px-4 py-2 font-semibold text-success data-[state=on]:border-success data-[state=on]:bg-success data-[state=on]:text-white"
        >
          <CircleCheck className="mr-1 size-4" />
          {t('calendar.completed')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="dropped"
          className="rounded-md! border border-danger/20 px-4 py-2 font-semibold text-danger data-[state=on]:border-danger data-[state=on]:bg-danger data-[state=on]:text-white"
        >
          <CircleX className="mr-1 size-4" />
          {t('calendar.dropped')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="started"
          className="rounded-md! border border-warning/20 px-4 py-2 font-semibold text-warning data-[state=on]:border-warning data-[state=on]:bg-warning data-[state=on]:text-white"
        >
          <Play className="mr-1 size-4" />
          {t('calendar.started')}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
