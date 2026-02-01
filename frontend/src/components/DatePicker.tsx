import React from 'react'
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/en-gb'
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

  const handleChange = (newValue: Dayjs | null) => {
    if (newValue) {
      onChange(newValue.format('YYYY-MM-DD'))
    }
  }

  const parsedValue = value ? dayjs(value) : null

  // Use en-gb locale for Monday start, en for Sunday start
  const adapterLocale = getFirstDayNumber() === 1 ? 'en-gb' : 'en'

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={adapterLocale}>
      <MuiDatePicker
        label={label}
        value={parsedValue}
        onChange={handleChange}
        disabled={disabled}
        maxDate={maxDate}
        minDate={minDate}
        slotProps={{
          textField: {
            required,
            error,
            helperText,
            fullWidth: true,
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

export default DatePicker