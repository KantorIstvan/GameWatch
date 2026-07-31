import React, { useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
  const { timeFormat } = useTimeFormat()
  const { getFirstDayNumber } = useWeekStart()
  const [open, setOpen] = useState(false)

  const parsedValue = value ? dayjs(value) : null
  const isValid = !!parsedValue?.isValid()
  const selectedDate = isValid ? parsedValue!.toDate() : undefined

  const is12h = timeFormat === '12h'
  const hour24 = isValid ? parsedValue!.hour() : 0
  const minute = isValid ? parsedValue!.minute() : 0
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = ((hour24 + 11) % 12) + 1

  const commit = (next: Dayjs) => {
    onChange(next.format('YYYY-MM-DDTHH:mm'))
  }

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return
    const base = isValid ? parsedValue! : dayjs()
    commit(dayjs(date).hour(base.hour()).minute(base.minute()).second(0))
  }

  const handleHourChange = (raw: string) => {
    const base = isValid ? parsedValue! : dayjs()
    let n = parseInt(raw, 10)
    if (Number.isNaN(n)) return
    if (is12h) {
      n = Math.min(12, Math.max(1, n))
      const newHour24 = period === 'PM' ? (n % 12) + 12 : n % 12
      commit(base.hour(newHour24))
    } else {
      n = Math.min(23, Math.max(0, n))
      commit(base.hour(n))
    }
  }

  const handleMinuteChange = (raw: string) => {
    const base = isValid ? parsedValue! : dayjs()
    let n = parseInt(raw, 10)
    if (Number.isNaN(n)) return
    n = Math.min(59, Math.max(0, n))
    commit(base.minute(n))
  }

  const handlePeriodChange = (next: string) => {
    if (!next) return
    const base = isValid ? parsedValue! : dayjs()
    const currentHour12 = ((base.hour() + 11) % 12) + 1
    const newHour24 = next === 'PM' ? (currentHour12 % 12) + 12 : currentHour12 % 12
    commit(base.hour(newHour24))
  }

  const display = isValid
    ? parsedValue!.format(is12h ? 'YYYY-MM-DD hh:mm A' : 'YYYY-MM-DD HH:mm')
    : 'Select date & time'

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
          <div className="flex items-center gap-2 border-t border-border p-3">
            <Input
              type="number"
              inputMode="numeric"
              className="w-16"
              min={is12h ? 1 : 0}
              max={is12h ? 12 : 23}
              value={is12h ? hour12 : hour24}
              onChange={(e) => handleHourChange(e.target.value)}
            />
            <span className="text-muted-foreground">:</span>
            <Input
              type="number"
              inputMode="numeric"
              className="w-16"
              min={0}
              max={59}
              value={minute.toString().padStart(2, '0')}
              onChange={(e) => handleMinuteChange(e.target.value)}
            />
            {is12h && (
              <ToggleGroup
                type="single"
                value={period}
                onValueChange={handlePeriodChange}
                variant="outline"
              >
                <ToggleGroupItem value="AM">AM</ToggleGroupItem>
                <ToggleGroupItem value="PM">PM</ToggleGroupItem>
              </ToggleGroup>
            )}
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
