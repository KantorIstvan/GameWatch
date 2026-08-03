import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleCheck, CircleX, Locate, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useWeekStart } from '../../contexts/WeekStartContext'
import { TimelineEvent } from '../../types/timeline'
import {
  addDays,
  diffInDays,
  getStartOfDay,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfWeek,
  parseLocalDate,
} from '../../utils/dateUtils'

interface TimelineGanttViewProps {
  events: TimelineEvent[]
  onEventClick: (eventId: string) => void
}

type ZoomLevel = 'day' | 'week' | 'month'

const PX_PER_DAY: Record<ZoomLevel, number> = { day: 40, week: 12, month: 4 }
const LABEL_WIDTH = 224
const ROW_HEIGHT = 56
const BAR_HEIGHT = 28
const MIN_BAR_PX = 8

interface Tick {
  key: string
  date: Date
  offsetDays: number
  spanDays: number
}

function buildTicks(rangeStart: Date, rangeEnd: Date, zoom: ZoomLevel, weekStart: 'MONDAY' | 'SUNDAY'): Tick[] {
  const ticks: Tick[] = []

  if (zoom === 'day') {
    let cursor = rangeStart
    let offset = 0
    while (cursor < rangeEnd) {
      ticks.push({ key: cursor.toISOString(), date: cursor, offsetDays: offset, spanDays: 1 })
      cursor = addDays(cursor, 1)
      offset += 1
    }
    return ticks
  }

  if (zoom === 'week') {
    let cursor = getStartOfWeek(rangeStart, weekStart)
    while (cursor < rangeEnd) {
      ticks.push({ key: cursor.toISOString(), date: cursor, offsetDays: diffInDays(rangeStart, cursor), spanDays: 7 })
      cursor = addDays(cursor, 7)
    }
    return ticks
  }

  let cursor = getStartOfMonth(rangeStart)
  while (cursor < rangeEnd) {
    const monthEndExclusive = addDays(getEndOfMonth(cursor), 1)
    ticks.push({
      key: cursor.toISOString(),
      date: cursor,
      offsetDays: diffInDays(rangeStart, cursor),
      spanDays: diffInDays(cursor, monthEndExclusive),
    })
    cursor = monthEndExclusive
  }
  return ticks
}

interface Group {
  key: string
  date: Date
  offsetDays: number
  spanDays: number
}

function groupTicks(ticks: Tick[], zoom: ZoomLevel): Group[] {
  const groups: Group[] = []
  ticks.forEach((tick) => {
    const key = zoom === 'month' ? `${tick.date.getFullYear()}` : `${tick.date.getFullYear()}-${tick.date.getMonth()}`
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.spanDays += tick.spanDays
    } else {
      groups.push({ key, date: tick.date, offsetDays: tick.offsetDays, spanDays: tick.spanDays })
    }
  })
  return groups
}

function statusIcon(event: TimelineEvent) {
  if (event.extendedProps.isCompleted) return <CircleCheck className="size-4 shrink-0 text-success" />
  if (event.extendedProps.isDropped) return <CircleX className="size-4 shrink-0 text-danger" />
  return <Play className="size-4 shrink-0 text-warning" />
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export const TimelineGanttView = ({ events, onEventClick }: TimelineGanttViewProps) => {
  const { t } = useTranslation()
  const { weekStart } = useWeekStart()
  const [zoom, setZoom] = useState<ZoomLevel>('week')
  const scrollRef = useRef<HTMLDivElement>(null)

  const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString(t('app.locale', 'en'), options)

  const rows = useMemo(
    () => [...events].sort((a, b) => parseLocalDate(b.start).getTime() - parseLocalDate(a.start).getTime()),
    [events]
  )

  const { rangeStart: rawRangeStart, rangeEnd } = useMemo(() => {
    const today = getStartOfDay(new Date())
    if (rows.length === 0) {
      return { rangeStart: addDays(today, -14), rangeEnd: addDays(today, 14) }
    }

    let minStart = parseLocalDate(rows[0].start)
    let maxEnd = today
    rows.forEach((event) => {
      const start = parseLocalDate(event.start)
      if (start < minStart) minStart = start
      const end = event.end ? parseLocalDate(event.end) : addDays(start, 1)
      if (end > maxEnd) maxEnd = end
    })

    return { rangeStart: addDays(minStart, -3), rangeEnd: addDays(maxEnd, 7) }
  }, [rows])

  // Header ticks are generated on week/month boundaries (buildTicks below), while bars
  // are positioned by day-offset from rangeStart. Aligning rangeStart itself to that same
  // boundary keeps both in the same coordinate system — otherwise the first tick starts
  // before rangeStart but renders at the same x=0, shifting every header label relative
  // to the bars underneath it.
  const rangeStart = useMemo(() => {
    if (zoom === 'week') return getStartOfWeek(rawRangeStart, weekStart)
    if (zoom === 'month') return getStartOfMonth(rawRangeStart)
    return rawRangeStart
  }, [rawRangeStart, zoom, weekStart])

  const pxPerDay = PX_PER_DAY[zoom]
  const totalDays = Math.max(diffInDays(rangeStart, rangeEnd), 1)
  const totalWidth = totalDays * pxPerDay

  const ticks = useMemo(() => buildTicks(rangeStart, rangeEnd, zoom, weekStart), [rangeStart, rangeEnd, zoom, weekStart])
  const groups = useMemo(() => groupTicks(ticks, zoom), [ticks, zoom])

  const todayOffsetDays = diffInDays(rangeStart, getStartOfDay(new Date()))
  const showTodayLine = todayOffsetDays >= 0 && todayOffsetDays <= totalDays

  const scrollToToday = () => {
    const el = scrollRef.current
    if (!el) return
    const todayPx = todayOffsetDays * pxPerDay
    el.scrollTo({ left: Math.max(todayPx - el.clientWidth * 0.6, 0), behavior: 'smooth' })
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const todayPx = todayOffsetDays * pxPerDay
    el.scrollLeft = Math.max(todayPx - el.clientWidth * 0.6, 0)
    // Only re-center automatically when the scale or visible range changes, not on every scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, rangeStart.getTime(), rangeEnd.getTime()])

  return (
    <div className="gw-calendar-card overflow-hidden rounded-xl border border-border bg-surface-raised p-4 shadow-1 transition-all duration-300 sm:p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={zoom}
          onValueChange={(v) => v && setZoom(v as ZoomLevel)}
          variant="outline"
          className="gap-2"
        >
          <ToggleGroupItem
            value="day"
            className="rounded-md! border border-border px-3 py-1.5 text-body-sm font-semibold text-text-secondary data-[state=on]:border-accent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          >
            {t('calendar.zoomDay')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="week"
            className="rounded-md! border border-border px-3 py-1.5 text-body-sm font-semibold text-text-secondary data-[state=on]:border-accent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          >
            {t('calendar.zoomWeek')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="month"
            className="rounded-md! border border-border px-3 py-1.5 text-body-sm font-semibold text-text-secondary data-[state=on]:border-accent data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          >
            {t('calendar.zoomMonth')}
          </ToggleGroupItem>
        </ToggleGroup>

        <Button type="button" variant="outline" size="sm" onClick={scrollToToday} className="gap-1.5" aria-label={t('calendar.jumpToToday')}>
          <Locate className="size-4" />
          {t('calendar.today')}
        </Button>
      </div>

      <div ref={scrollRef} className="max-h-144 overflow-auto rounded-lg border border-border">
        <div className="relative flex flex-col" style={{ width: LABEL_WIDTH + totalWidth }}>
          {/* Header */}
          <div className="sticky top-0 z-20 flex bg-surface-raised">
            <div className="sticky left-0 z-30 h-14 shrink-0 border-b border-r border-border bg-surface-raised" style={{ width: LABEL_WIDTH }} />
            <div style={{ width: totalWidth }}>
              <div className="flex h-6 items-end border-b border-border">
                {groups.map((group) => (
                  <div
                    key={group.key}
                    style={{ width: group.spanDays * pxPerDay }}
                    className="shrink-0 truncate px-2 text-caption font-semibold text-text-secondary"
                  >
                    {zoom === 'month'
                      ? group.date.getFullYear()
                      : formatDate(group.date, { month: 'long', year: 'numeric' })}
                  </div>
                ))}
              </div>
              <div className="flex h-8 items-center border-b border-border">
                {ticks.map((tick, index) => {
                  const isWeekend = zoom === 'day' && (tick.date.getDay() === 0 || tick.date.getDay() === 6)
                  return (
                    <div
                      key={tick.key}
                      style={{ width: tick.spanDays * pxPerDay }}
                      className={cn(
                        'flex shrink-0 flex-col items-center justify-center border-border text-caption text-text-secondary',
                        zoom !== 'day' && index > 0 && 'items-start border-l pl-1.5',
                        isWeekend && 'bg-surface/60'
                      )}
                    >
                      {zoom === 'day' && (
                        <>
                          <span className="font-semibold text-text-primary">{tick.date.getDate()}</span>
                          <span>{formatDate(tick.date, { weekday: 'narrow' })}</span>
                        </>
                      )}
                      {zoom === 'week' && <span className="font-medium">{formatDate(tick.date, { month: 'short', day: 'numeric' })}</span>}
                      {zoom === 'month' && <span className="font-medium">{formatDate(tick.date, { month: 'short' })}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Rows */}
          {rows.map((event) => {
            const start = parseLocalDate(event.start)
            const end = event.end ? parseLocalDate(event.end) : addDays(start, 1)
            const offsetDays = Math.min(Math.max(diffInDays(rangeStart, start), 0), totalDays)
            const endOffsetDays = Math.min(Math.max(diffInDays(rangeStart, end), 0), totalDays)
            const barLeft = offsetDays * pxPerDay
            const barWidth = Math.max((endOffsetDays - offsetDays) * pxPerDay - 2, MIN_BAR_PX)
            const statusLabel = event.extendedProps.isCompleted
              ? t('calendar.completed')
              : event.extendedProps.isDropped
                ? t('calendar.dropped')
                : t('calendar.started')

            return (
              <div key={event.id} className="flex" style={{ height: ROW_HEIGHT }}>
                <div
                  className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-b border-r border-border bg-surface-raised px-3"
                  style={{ width: LABEL_WIDTH }}
                >
                  {statusIcon(event)}
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-text-primary">{event.title}</p>
                    <p className="truncate text-caption text-text-secondary">
                      {formatDate(start, { month: 'short', day: 'numeric' })}
                      {event.end && ` – ${formatDate(parseLocalDate(event.end), { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                </div>
                <div className="relative border-b border-border" style={{ width: totalWidth }}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onEventClick(event.id)}
                        className="absolute top-1/2 -translate-y-1/2 rounded-full transition-opacity duration-150 ease-standard hover:opacity-80"
                        style={{
                          left: barLeft,
                          width: barWidth,
                          height: BAR_HEIGHT,
                          backgroundColor: event.backgroundColor,
                          border: `1.5px solid ${event.borderColor}`,
                        }}
                        aria-label={`${event.title} · ${statusLabel}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-text-secondary">
                        {statusLabel}
                        {' · '}
                        {formatDuration(event.extendedProps.durationSeconds)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )
          })}

          {zoom !== 'day' &&
            ticks.slice(1).map((tick) => (
              <div
                key={`grid-${tick.key}`}
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-border"
                style={{ left: LABEL_WIDTH + tick.offsetDays * pxPerDay }}
              />
            ))}

          {showTodayLine && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-accent"
              style={{ left: LABEL_WIDTH + todayOffsetDays * pxPerDay }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
