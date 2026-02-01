import apiClient from './api'

export interface BackupData {
  version: string
  timestamp: string
  data: {
    games: any[]
    playthroughs: any[]
    sessions: any[]
    moodEntries: any[]
    healthSettings: any
    metadata: {
      totalGames: number
      totalPlaythroughs: number
      totalSessions: number
      totalMoodEntries: number
      totalPlaytimeSeconds: number
    }
  }
}

const backupApi = {
  exportBackup: () => apiClient.get<BackupData>('/backup/export'),
  
  importBackup: (backup: BackupData) => apiClient.post('/backup/import', backup),
}

export default backupApi
