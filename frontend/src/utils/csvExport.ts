import { UserStatistics } from '../types'
import { formatTime } from './formatters'

export function exportStatisticsToCSV(
  statistics: UserStatistics,
  interval: 'week' | 'month' | 'year' | 'all'
) {
  const rows: any[][] = []
  
  rows.push(['GameWatch Statistics Export'])
  rows.push(['Export Date', new Date().toLocaleString()])
  rows.push(['Time Period', interval === 'week' ? 'Last Week' : interval === 'month' ? 'Last Month' : interval === 'year' ? 'Last Year' : 'All Time'])
  rows.push([])
  
  rows.push(['Overview Statistics'])
  rows.push(['Total Playtime', formatTime(statistics.totalPlaytimeSeconds)])
  rows.push(['Total Games', statistics.totalGamesCount])
  rows.push(['Games Completed', statistics.gamesCompleted])
  rows.push(['Games In Progress', statistics.gamesInProgress])
  rows.push(['Total Sessions', statistics.totalSessionCount])
  rows.push(['Average Session Time', formatTime(Math.round(statistics.averageSessionPlaytimeSeconds))])
  rows.push(['Longest Session', formatTime(statistics.longestSessionSeconds)])
  rows.push(['Library Completion', `${statistics.libraryCompletionPercentage.toFixed(1)}%`])
  if (statistics.favoriteDeveloper) rows.push(['Favorite Developer', statistics.favoriteDeveloper])
  if (statistics.favoritePublisher) rows.push(['Favorite Publisher', statistics.favoritePublisher])
  rows.push([])
  
  if (statistics.dailyPlaytime.length > 0) {
    rows.push(['Daily Playtime'])
    rows.push(['Date', 'Hours'])
    statistics.dailyPlaytime.forEach(dp => {
      if (dp.playtimeSeconds > 0) {
        rows.push([
          new Date(dp.date).toLocaleDateString(),
          (dp.playtimeSeconds / 3600).toFixed(2)
        ])
      }
    })
    rows.push([])
  }
  
  if (Object.keys(statistics.genreDistribution).length > 0) {
    rows.push(['Genre Distribution'])
    rows.push(['Genre', 'Hours'])
    Object.entries(statistics.genreDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([genre, seconds]) => {
        rows.push([genre, (seconds / 3600).toFixed(2)])
      })
    rows.push([])
  }
  
  if (statistics.platformDistribution && Object.keys(statistics.platformDistribution).length > 0) {
    rows.push(['Platform Distribution'])
    rows.push(['Platform', 'Hours'])
    Object.entries(statistics.platformDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([platform, seconds]) => {
        rows.push([platform, (seconds / 3600).toFixed(2)])
      })
    rows.push([])
  }
  
  if (statistics.timeOfDayStats && statistics.timeOfDayStats.hourlyDistribution) {
    rows.push(['Hourly Activity'])
    rows.push(['Hour', 'Hours Played'])
    Object.entries(statistics.timeOfDayStats.hourlyDistribution)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([hour, seconds]) => {
        rows.push([`${hour}:00`, (seconds / 3600).toFixed(2)])
      })
    rows.push([])
  }
  
  if (statistics.dayOfWeekTotalPlaytime) {
    rows.push(['Playtime by Day of Week'])
    rows.push(['Day', 'Total Hours', 'Average Hours'])
    const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dayOrder.forEach((day, index) => {
      const totalHours = (statistics.dayOfWeekTotalPlaytime[day] || 0) / 3600
      const avgHours = (statistics.dayOfWeekPlaytime[day] || 0) / 3600
      rows.push([dayNames[index], totalHours.toFixed(2), avgHours.toFixed(2)])
    })
    rows.push([])
  }
  
  if (statistics.favoriteGame) {
    rows.push(['Favorite Game'])
    rows.push(['Game Name', 'Total Playtime'])
    rows.push([statistics.favoriteGame.gameName, formatTime(statistics.favoriteGame.playtimeSeconds)])
    rows.push([])
  }
  
  if (statistics.longestToCompleteGame) {
    rows.push(['Longest to Complete'])
    rows.push(['Game Name', 'Days to Complete', 'Total Playtime'])
    rows.push([
      statistics.longestToCompleteGame.gameName,
      statistics.longestToCompleteGame.daysToComplete,
      formatTime(statistics.longestToCompleteGame.playtimeSeconds)
    ])
    rows.push([])
  }
  
  if (statistics.fastestToCompleteGame) {
    rows.push(['Fastest Completion'])
    rows.push(['Game Name', 'Days to Complete', 'Total Playtime'])
    rows.push([
      statistics.fastestToCompleteGame.gameName,
      statistics.fastestToCompleteGame.daysToComplete,
      formatTime(statistics.fastestToCompleteGame.playtimeSeconds)
    ])
    rows.push([])
  }
  
  if (statistics.topMostPlayedGames.length > 0) {
    rows.push(['Top Most Played Games'])
    rows.push(['Rank', 'Game', 'Playtime'])
    statistics.topMostPlayedGames.forEach((game, index) => {
      rows.push([
        index + 1,
        game.gameName,
        formatTime(game.playtimeSeconds)
      ])
    })
    rows.push([])
  }
  
  const csvContent = rows.map(row => 
    row.map(cell => {
      const cellStr = String(cell ?? '')
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(',')
  ).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `gamewatch-statistics-${interval}-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
