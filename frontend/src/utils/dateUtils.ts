/**
 * Date utility functions for calendar-based period calculations.
 * 
 * IMPORTANT: These functions use calendar boundaries (week/month/year), NOT rolling periods.
 * - Week: First day of week (Monday or Sunday) 00:00 to current time
 * - Month: 1st day 00:00 to current time
 * - Year: January 1st 00:00 to current time
 */

type WeekStart = 'MONDAY' | 'SUNDAY'

/**
 * Get the start of the current calendar week.
 * @param date - The date to calculate from (defaults to now)
 * @param weekStart - First day of week ('MONDAY' for ISO 8601, 'SUNDAY' for US standard)
 */
export function getStartOfWeek(date: Date = new Date(), weekStart: WeekStart = 'MONDAY'): Date {
  const result = new Date(date)
  const day = result.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  let diff: number
  if (weekStart === 'SUNDAY') {
    // For Sunday start: Sunday = 0 days back, Monday = 1 day back, etc.
    diff = day
  } else {
    // For Monday start (ISO 8601): Monday = 0 days back, Tuesday = 1 day back, ..., Sunday = 6 days back
    diff = day === 0 ? 6 : day - 1
  }
  
  result.setDate(result.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the start of the current calendar month (1st day at 00:00:00).
 */
export function getStartOfMonth(date: Date = new Date()): Date {
  const result = new Date(date)
  result.setDate(1)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the start of the current calendar year (January 1st at 00:00:00).
 */
export function getStartOfYear(date: Date = new Date()): Date {
  const result = new Date(date)
  result.setMonth(0, 1)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the end of the current day (23:59:59.999).
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Get the current week's date range.
 * @param now - Current date/time (defaults to now)
 * @param weekStart - First day of week ('MONDAY' or 'SUNDAY')
 * Use this for "weekly" data calculations.
 */
export function getCurrentWeekRange(now: Date = new Date(), weekStart: WeekStart = 'MONDAY'): { start: Date; end: Date } {
  return {
    start: getStartOfWeek(now, weekStart),
    end: new Date(now), // Current moment
  }
}

/**
 * Get the current month's date range (1st day 00:00 to now).
 * Use this for "monthly" data calculations.
 */
export function getCurrentMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  return {
    start: getStartOfMonth(now),
    end: new Date(now), // Current moment
  }
}

/**
 * Get the current year's date range (Jan 1st 00:00 to now).
 * Use this for "yearly" data calculations.
 */
export function getCurrentYearRange(now: Date = new Date()): { start: Date; end: Date } {
  return {
    start: getStartOfYear(now),
    end: new Date(now), // Current moment
  }
}

/**
 * Get the start of today (00:00:00).
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get today's date range (00:00:00 to now).
 */
export function getTodayRange(now: Date = new Date()): { start: Date; end: Date } {
  return {
    start: getStartOfDay(now),
    end: new Date(now), // Current moment
  }
}

/**
 * Check if a date is in the future.
 */
export function isFutureDate(date: Date, reference: Date = new Date()): boolean {
  return date.getTime() > reference.getTime()
}

/**
 * Format date for datetime-local input (YYYY-MM-DDTHH:mm).
 */
export function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Get the maximum allowed datetime for input fields (current moment).
 */
export function getMaxDateTime(): string {
  return formatDateTimeLocal(new Date())
}
