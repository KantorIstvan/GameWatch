import React from 'react'
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs, { Dayjs } from 'dayjs'

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
  const handleChange = (newValue: Dayjs | null) => {
    if (newValue) {
      onChange(newValue.format('YYYY-MM-DD'))
    }
  }

  const parsedValue = value ? dayjs(value) : null

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                minHeight: 48,
                '&:hover fieldset': {
                  borderColor: (theme) => theme.palette.primary.main,
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
            },
          },
        }}
      />
    </LocalizationProvider>
  )
}

export default DatePicker