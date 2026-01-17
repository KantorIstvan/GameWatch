import apiClient from './api'

export interface HealthSettings {
  notificationsEnabled: boolean
  soundsEnabled: boolean
  hydrationReminderEnabled: boolean
  hydrationIntervalMinutes: number
  standReminderEnabled: boolean
  standIntervalMinutes: number
  breakReminderEnabled: boolean
  breakIntervalMinutes: number
  breakDurationMinutes: number
  goalsEnabled: boolean
  maxHoursPerDayEnabled: boolean
  maxHoursPerDay: number | null
  maxSessionsPerDayEnabled: boolean
  maxSessionsPerDay: number | null
  maxHoursPerWeekEnabled: boolean
  maxHoursPerWeek: number | null
  goalNotificationsEnabled: boolean
  moodPromptEnabled: boolean
  moodPromptRequired: boolean
}

export interface MoodEntry {
  id: number
  sessionHistoryId: number | null
  moodRating: number // 1-5
  note: string | null
  recordedAt: string
}

export interface DailyHealthMetrics {
  id: number
  metricDate: string
  healthScore: number | null
  totalHours: number
  sessionCount: number
  averageMood: number | null
  lateNightMinutes: number
  breakComplianceRatio: number
  sessionsWithBreaks: number
  morningSessions: number
  afternoonSessions: number
  eveningSessions: number
  nightSessions: number
  lateNightSessions: number
}

export interface WeeklyMetrics {
  totalHours: number
  totalSessions: number
  averageMood: number | null
  breakCompliance: number
  lateNightMinutes: number
}

export interface SessionWithMood {
  sessionId: number
  playthroughId: number
  gameName: string
  durationSeconds: number
  moodRating: number | null
  endedAt: string
}

export interface GoalProgress {
  goalsEnabled: boolean
  hoursToday: number
  maxHoursPerDay: number | null
  maxHoursPerDayEnabled: boolean
  sessionsToday: number
  maxSessionsPerDay: number | null
  maxSessionsPerDayEnabled: boolean
  hoursThisWeek: number
  maxHoursPerWeek: number | null
  maxHoursPerWeekEnabled: boolean
}

export interface HealthDashboard {
  currentHealthScore: number | null
  currentDate: string
  weeklyAverageScore: number | null
  last7DaysScores: number[]
  yearlyHeatmap: Record<string, number>
  todayMetrics: DailyHealthMetrics | null
  weekMetrics: WeeklyMetrics
  recentMoods: MoodEntry[]
  recentSessions: SessionWithMood[]
  goalProgress: GoalProgress
}

export interface SubmitMoodRequest {
  sessionHistoryId?: number | null
  moodRating: number // 1-5
  note?: string | null
}

const healthApi = {
  getHealthDashboard: () => {
    return apiClient.get<HealthDashboard>('/user-health/dashboard')
  },

  getHealthSettings: () => {
    return apiClient.get<HealthSettings>('/user-health/settings')
  },

  updateHealthSettings: (settings: HealthSettings) => {
    return apiClient.put<HealthSettings>('/user-health/settings', settings)
  },

  submitMood: (request: SubmitMoodRequest) => {
    return apiClient.post<MoodEntry>('/user-health/mood', request)
  },

  updateUserAge: (age: number | null) => {
    return apiClient.put('/users/me/age', { age })
  },
}

export default healthApi
