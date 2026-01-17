/**
 * Format seconds into HH:MM:SS format
 * Example: 3661 -> "01:01:01"
 */
export const formatTimeHMS = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Format seconds into compact format (e.g., "1h 30m")
 * Example: 5400 -> "1h 30m"
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * Format seconds into detailed format (e.g., "1h 30m 45s")
 * Example: 5445 -> "1h 30m 45s"
 */
export const formatTimeDetailed = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

/**
 * Format duration for display
 * Returns "0h 0m 0s" if seconds is 0
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds) return '0h 0m 0s'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

/**
 * Format date to string
 * Example: "2024-01-15" -> "Jan 15, 2024"
 */
export const formatDate = (dateString: string | undefined): string | null => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Format date with time
 * Example: "2024-01-15T10:30:00" -> "Jan 15, 2024, 10:30 AM"
 */
export const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format date only (no time)
 * Example: "2024-01-15T10:30:00" -> "Jan 15, 2024"
 */
export const formatDateOnly = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  })
}

export const formatPlaythroughType = (type: string): string => {
  if (type === '100_percent') return '100%'
  if (type === '100%') return '100%'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export const getPlaythroughTypeColor = (type: string): string => {
  const normalizedType = type === '100_percent' ? '100%' : type
  const colors: Record<string, string> = {
    'story': '#9C27B0',
    'speedrun': '#FF5722',
    'casual': '#2196F3',
    '100%': '#4CAF50',
  }
  return colors[normalizedType] || '#757575'
}
