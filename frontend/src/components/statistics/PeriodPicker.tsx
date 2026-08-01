import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWeekStart } from '../../contexts/WeekStartContext'
import {
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfYear,
  getEndOfYear,
  addWeeks,
  addMonths,
  addYears,
  getISOWeekNumber,
} from '../../utils/dateUtils'

type BoundedInterval = 'week' | 'month' | 'year'

interface PeriodPickerProps {
  interval: BoundedInterval
  referenceDate: Date
  onChange: (date: Date) => void
}

const YEAR_OPTIONS_COUNT = 15

function PeriodPicker({ interval, referenceDate, onChange }: PeriodPickerProps) {
  const { t, i18n } = useTranslation()
  const { weekStart, getFirstDayNumber } = useWeekStart()
  const [open, setOpen] = useState(false)

  const today = useMemo(() => new Date(), [])
  const currentYear = today.getFullYear()

  const years = useMemo(
    () => Array.from({ length: YEAR_OPTIONS_COUNT }, (_, i) => currentYear - i),
    [currentYear]
  )

  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, i) =>
      new Date(2000, i, 1).toLocaleDateString(i18n.language, { month: 'long' })
    ),
    [i18n.language]
  )

  const { periodStart, periodEnd } = useMemo(() => {
    if (interval === 'week') {
      return { periodStart: getStartOfWeek(referenceDate, weekStart), periodEnd: getEndOfWeek(referenceDate, weekStart) }
    }
    if (interval === 'month') {
      return { periodStart: getStartOfMonth(referenceDate), periodEnd: getEndOfMonth(referenceDate) }
    }
    return { periodStart: getStartOfYear(referenceDate), periodEnd: getEndOfYear(referenceDate) }
  }, [interval, referenceDate, weekStart])

  const isCurrentPeriod = periodStart <= today && today <= periodEnd

  const label = useMemo(() => {
    if (interval === 'week') {
      const weekNumber = getISOWeekNumber(referenceDate)
      const startStr = periodStart.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })
      const endStr = periodEnd.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })
      return `${t('statistics.userStats.currentWeekLabel', { number: weekNumber })} · ${startStr} – ${endStr}`
    }
    if (interval === 'month') {
      return referenceDate.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
    }
    return referenceDate.getFullYear().toString()
  }, [interval, referenceDate, periodStart, periodEnd, i18n.language, t])

  const step = (amount: number) => {
    if (interval === 'week') onChange(addWeeks(referenceDate, amount))
    else if (interval === 'month') onChange(addMonths(referenceDate, amount))
    else onChange(addYears(referenceDate, amount))
  }

  const handleMonthChange = (value: string) => {
    const next = new Date(referenceDate)
    next.setDate(1)
    next.setMonth(parseInt(value, 10))
    onChange(next)
  }

  const handleYearChange = (value: string, closeOnSelect: boolean) => {
    const next = new Date(referenceDate)
    next.setDate(1)
    next.setFullYear(parseInt(value, 10))
    onChange(next)
    if (closeOnSelect) setOpen(false)
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={t('statistics.userStats.previousPeriod')}
        onClick={() => step(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="min-w-40 justify-center font-normal">
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          {interval === 'week' && (
            <Calendar
              mode="single"
              selected={referenceDate}
              onSelect={(date) => {
                if (date) {
                  onChange(date)
                  setOpen(false)
                }
              }}
              weekStartsOn={getFirstDayNumber() as 0 | 1}
              showWeekNumber
              disabled={{ after: today }}
              autoFocus
            />
          )}

          {interval === 'month' && (
            <div className="flex items-center gap-2 p-3">
              <Select value={referenceDate.getMonth().toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-35" aria-label={t('statistics.userStats.selectMonth')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, idx) => (
                    <SelectItem
                      key={idx}
                      value={idx.toString()}
                      disabled={referenceDate.getFullYear() === currentYear && idx > today.getMonth()}
                    >
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={referenceDate.getFullYear().toString()} onValueChange={(v) => handleYearChange(v, false)}>
                <SelectTrigger className="w-25" aria-label={t('statistics.userStats.selectYear')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {interval === 'year' && (
            <div className="p-3">
              <Select value={referenceDate.getFullYear().toString()} onValueChange={(v) => handleYearChange(v, true)}>
                <SelectTrigger className="w-30" aria-label={t('statistics.userStats.selectYear')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={t('statistics.userStats.nextPeriod')}
        disabled={isCurrentPeriod}
        onClick={() => step(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

export default PeriodPicker
