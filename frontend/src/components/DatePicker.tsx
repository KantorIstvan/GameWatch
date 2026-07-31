import React, { useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useWeekStart } from '../contexts/WeekStartContext'

interface DatePickerProps {
  label: string
  value: string
  onChange: (date: string) => void
  disabled?: boolean
  required?: boolean
  error?: boolean
  helperText?: string
  maxDate?: Dayjs
  minDate?: Dayjs
}

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  error = false,
  helperText,
  maxDate,
  minDate,
}) => {
  const { getFirstDayNumber } = useWeekStart()
  const [open, setOpen] = useState(false)

  const parsedValue = value ? dayjs(value) : null
  const selected = parsedValue?.isValid() ? parsedValue.toDate() : undefined

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(dayjs(date).format('YYYY-MM-DD'))
      setOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className={cn(error && 'text-destructive')}>
        {label}
        {required && ' *'}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={error}
            className={cn(
              'w-full justify-start text-left font-normal',
              !selected && 'text-muted-foreground',
              error && 'border-destructive'
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {selected ? dayjs(selected).format('YYYY-MM-DD') : 'Select date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            weekStartsOn={getFirstDayNumber() as 0 | 1}
            disabled={(date) =>
              (!!maxDate && date > maxDate.toDate()) ||
              (!!minDate && date < minDate.toDate())
            }
            autoFocus
          />
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

export default DatePicker
