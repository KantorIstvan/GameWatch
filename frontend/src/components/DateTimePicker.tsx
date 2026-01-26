import React from 'react'
import { DateTimePicker as MuiDateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs, { Dayjs } from 'dayjs'

interface DateTimePickerProps {
  label: string
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
  const handleChange = (newValue: Dayjs | null) => {
    if (newValue) {
      onChange(newValue.format('YYYY-MM-DDTHH:mm'))
    }
  }

  const parsedValue = value ? dayjs(value) : null

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MuiDateTimePicker
        label={label}
        value={parsedValue}
        onChange={handleChange}
        disabled={disabled}
        maxDateTime={maxDateTime}
        minDateTime={minDateTime}
        slotProps={{
          textField: {
            required,
            error,
            helperText,
            sx: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
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

export default DateTimePicker