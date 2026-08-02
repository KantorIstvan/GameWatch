import React, { useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { CalendarIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TimePickerClock } from '@/components/ui/time-picker-clock'
import { cn } from '@/lib/utils'
import { useTimeFormat } from '../contexts/TimeFormatContext'
import { useWeekStart } from '../contexts/WeekStartContext'

interface DateTimePickerProps {
  label?: string
  value: string
  onChange: (dateTime: string) => void
  disabled?: boolean
  required?: boolean
  error?: boolean
  helperText?: string
  maxDateTime?: Dayjs
  minDateTime?: Dayjs
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  error = false,
  helperText,
  maxDateTime,
  minDateTime,
}) => {
  const { t } = useTranslation()
  const { timeFormat } = useTimeFormat()
  const { getFirstDayNumber } = useWeekStart()
  const [open, setOpen] = useState(false)

  const parsedValue = value ? dayjs(value) : null
  const isValid = !!parsedValue?.isValid()
  const selectedDate = isValid ? parsedValue!.toDate() : undefined

  const is12h = timeFormat === '12h'
  const hour24 = isValid ? parsedValue!.hour() : 0
  const minute = isValid ? parsedValue!.minute() : 0

  const commit = (next: Dayjs) => {
    onChange(next.format('YYYY-MM-DDTHH:mm'))
  }

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return
    const base = isValid ? parsedValue! : dayjs()
    commit(dayjs(date).hour(base.hour()).minute(base.minute()).second(0))
  }

  const handleTimeChange = (newHour24: number, newMinute: number) => {
    const base = isValid ? parsedValue! : dayjs()
    commit(base.hour(newHour24).minute(newMinute))
  }

  const display = isValid
    ? parsedValue!.format(is12h ? 'YYYY-MM-DD hh:mm A' : 'YYYY-MM-DD HH:mm')
    : t('timePicker.selectDateTime')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Label className={cn(error && 'text-destructive')}>
          {label}
          {required && ' *'}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={error}
            className={cn(
              'w-full justify-start text-left font-normal',
              !isValid && 'text-muted-foreground',
              error && 'border-destructive'
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {display}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelectDate}
              weekStartsOn={getFirstDayNumber() as 0 | 1}
              disabled={(date) =>
                (!!maxDateTime && date > maxDateTime.endOf('day').toDate()) ||
                (!!minDateTime && date < minDateTime.startOf('day').toDate())
              }
              autoFocus
            />
            <div className="flex items-center justify-center border-t border-border p-4 sm:border-t-0 sm:border-l">
              <TimePickerClock hour24={hour24} minute={minute} is12h={is12h} onChange={handleTimeChange} />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {helperText && (
        <p className={cn('text-caption', error ? 'text-destructive' : 'text-muted-foreground')}>
          {helperText}
        </p>
      )}
    </div>
  )
}

export default DateTimePicker
