import React from 'react'
import { DateTimePicker as MuiDateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/en-gb'
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
  
  const handleChange = (newValue: Dayjs | null) => {
    if (newValue) {
      onChange(newValue.format('YYYY-MM-DDTHH:mm'))
    }
  }

  const parsedValue = value ? dayjs(value) : null

  // Use en-gb locale for Monday start, en for Sunday start
  const adapterLocale = getFirstDayNumber() === 1 ? 'en-gb' : 'en'

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={adapterLocale}>
      <MuiDateTimePicker
        label={label}
        value={parsedValue}
        onChange={handleChange}
        disabled={disabled}
        maxDateTime={maxDateTime}
        minDateTime={minDateTime}
        ampm={timeFormat === '12h'}
        viewRenderers={{
          hours: renderTimeViewClock,
          minutes: renderTimeViewClock,
          seconds: renderTimeViewClock,
        }}
        slotProps={{
          textField: {
            required,
            error,
            helperText,
            sx: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                minHeight: 56,
                transition: 'all 0.2s ease-in-out',
                '&:hover fieldset': {
                  borderColor: (theme) => theme.palette.primary.main,
                  borderWidth: 2,
                },
                '&.Mui-focused fieldset': {
                  borderWidth: 2,
                },
              },
            },
          },
          popper: {
            sx: {
              '& .MuiPaper-root': {
                borderRadius: 2,
                boxShadow: (theme) => theme.shadows[8],
              },
              '& .MuiDayCalendar-header': {
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                justifyItems: 'center',
              },
              '& .MuiDayCalendar-weekContainer': {
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                justifyItems: 'center',
                margin: 0,
              },
              '& .MuiPickersDay-root': {
                margin: 0,
              },
              '& .MuiDayCalendar-weekDayLabel': {
                margin: 0,
              },
            },
          },
        }}
      />
    </LocalizationProvider>
  )
}

export default DateTimePicker