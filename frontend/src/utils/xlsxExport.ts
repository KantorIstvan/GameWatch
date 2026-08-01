import ExcelJS from 'exceljs'
import { UserStatistics, GameStatistics, SessionDetail } from '../types'
import { formatDurationWords } from './formatters'

const ACCENT_ARGB = 'FF667EEA'
const MAX_COLUMN_WIDTH = 42

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function addHeaderRow(sheet: ExcelJS.Worksheet, values: string[]) {
  const row = sheet.addRow(values)
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT_ARGB } }
    cell.alignment = { vertical: 'middle' }
  })
  sheet.views = [{ state: 'frozen', ySplit: sheet.rowCount }]
  return row
}

function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 10
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const length = cell.value ? String(cell.value).length : 0
      if (length > maxLength) maxLength = length
    })
    column.width = Math.min(maxLength + 2, MAX_COLUMN_WIDTH)
  })
}

function addOverviewSheet(
  workbook: ExcelJS.Workbook,
  t: any,
  interval: 'week' | 'month' | 'year' | 'all',
  statistics: UserStatistics
) {
  const sheet = workbook.addWorksheet(t('statistics.export.overview'))
  addHeaderRow(sheet, [t('statistics.export.metric'), t('statistics.export.value')])

  const periodLabels: Record<typeof interval, string> = {
    week: t('statistics.userStats.week'),
    month: t('statistics.userStats.month'),
    year: t('statistics.userStats.year'),
    all: t('statistics.userStats.allTime')
  }

  sheet.addRow([t('statistics.export.exportDate'), new Date().toLocaleString()])
  sheet.addRow([t('statistics.export.timePeriod'), periodLabels[interval]])
  sheet.addRow([t('statistics.userStats.totalPlaytime'), formatDurationWords(statistics.totalPlaytimeSeconds, t)])
  sheet.addRow([t('statistics.userStats.totalGames'), statistics.totalGamesCount])
  sheet.addRow([t('statistics.export.gamesCompleted'), statistics.gamesCompleted])
  sheet.addRow([t('statistics.export.gamesInProgress'), statistics.gamesInProgress])
  sheet.addRow([t('statistics.userStats.totalSessions'), statistics.totalSessionCount])
  sheet.addRow([t('statistics.userStats.averageSession'), formatDurationWords(Math.round(statistics.averageSessionPlaytimeSeconds), t)])
  sheet.addRow([t('statistics.userStats.longestSession'), formatDurationWords(statistics.longestSessionSeconds, t)])
  sheet.addRow([t('statistics.userStats.libraryCompletion'), `${statistics.libraryCompletionPercentage.toFixed(1)}%`])
  if (statistics.favoriteDeveloper) sheet.addRow([t('statistics.userStats.favoriteDeveloper'), statistics.favoriteDeveloper])
  if (statistics.favoritePublisher) sheet.addRow([t('statistics.userStats.favoritePublisher'), statistics.favoritePublisher])

  autoFitColumns(sheet)
}

function addDailyPlaytimeSheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  const entries = statistics.dailyPlaytime.filter((dp) => dp.playtimeSeconds > 0)
  if (entries.length === 0) return

  const sheet = workbook.addWorksheet(t('statistics.userStats.dailyPlaytime'))
  addHeaderRow(sheet, [t('statistics.export.date'), t('statistics.export.totalDuration'), t('statistics.userStats.hours')])

  entries.forEach((dp) => {
    sheet.addRow([
      new Date(dp.date).toLocaleDateString(),
      formatDurationWords(dp.playtimeSeconds, t),
      Number((dp.playtimeSeconds / 3600).toFixed(2))
    ])
  })

  sheet.getColumn(3).numFmt = '0.00'
  autoFitColumns(sheet)
}

function addDistributionSheet(
  workbook: ExcelJS.Workbook,
  t: any,
  sheetName: string,
  labelHeader: string,
  distribution: Record<string, number>
) {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return

  const sheet = workbook.addWorksheet(sheetName)
  addHeaderRow(sheet, [labelHeader, t('statistics.export.totalDuration'), t('statistics.userStats.hours')])

  entries.forEach(([label, seconds]) => {
    sheet.addRow([label, formatDurationWords(seconds, t), Number((seconds / 3600).toFixed(2))])
  })

  sheet.getColumn(3).numFmt = '0.00'
  autoFitColumns(sheet)
}

function addHourlyActivitySheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  const entries = Object.entries(statistics.timeOfDayStats?.hourlyDistribution || {})
    .filter(([, seconds]) => seconds > 0)
    .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
  if (entries.length === 0) return

  const sheet = workbook.addWorksheet(t('statistics.userStats.hourlyActivity'))
  addHeaderRow(sheet, [t('statistics.export.hour'), t('statistics.export.totalDuration'), t('statistics.userStats.hours')])

  entries.forEach(([hour, seconds]) => {
    sheet.addRow([`${hour}:00`, formatDurationWords(seconds, t), Number((seconds / 3600).toFixed(2))])
  })

  sheet.getColumn(3).numFmt = '0.00'
  autoFitColumns(sheet)
}

function addDayOfWeekSheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  if (!statistics.dayOfWeekTotalPlaytime) return

  const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  const dayNameKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  const sheet = workbook.addWorksheet(t('statistics.userStats.playtimeByDayOfWeek'))
  addHeaderRow(sheet, [
    t('statistics.export.day'),
    t('statistics.export.totalDuration'),
    t('statistics.userStats.totalHours'),
    t('statistics.export.avgDuration'),
    t('statistics.userStats.avgPerSession')
  ])

  dayOrder.forEach((day, index) => {
    const totalSeconds = statistics.dayOfWeekTotalPlaytime[day] || 0
    const avgSeconds = statistics.dayOfWeekPlaytime[day] || 0
    sheet.addRow([
      t(`statistics.userStats.${dayNameKeys[index]}`),
      formatDurationWords(totalSeconds, t),
      Number((totalSeconds / 3600).toFixed(2)),
      formatDurationWords(avgSeconds, t),
      Number((avgSeconds / 3600).toFixed(2))
    ])
  })

  sheet.getColumn(3).numFmt = '0.00'
  sheet.getColumn(5).numFmt = '0.00'
  autoFitColumns(sheet)
}

function addHighlightsSheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  const rows: [string, string, number | string, string][] = []

  if (statistics.favoriteGame) {
    rows.push([t('statistics.userStats.favoriteGame'), statistics.favoriteGame.gameName, '', formatDurationWords(statistics.favoriteGame.playtimeSeconds, t)])
  }
  if (statistics.longestToCompleteGame) {
    rows.push([
      t('statistics.userStats.longestToComplete'),
      statistics.longestToCompleteGame.gameName,
      statistics.longestToCompleteGame.daysToComplete ?? '',
      formatDurationWords(statistics.longestToCompleteGame.playtimeSeconds, t)
    ])
  }
  if (statistics.fastestToCompleteGame) {
    rows.push([
      t('statistics.userStats.fastestCompletion'),
      statistics.fastestToCompleteGame.gameName,
      statistics.fastestToCompleteGame.daysToComplete ?? '',
      formatDurationWords(statistics.fastestToCompleteGame.playtimeSeconds, t)
    ])
  }
  if (rows.length === 0) return

  const sheet = workbook.addWorksheet(t('statistics.export.highlights'))
  addHeaderRow(sheet, [
    t('statistics.export.category'),
    t('statistics.export.game'),
    t('statistics.export.daysToComplete'),
    t('statistics.export.totalDuration')
  ])
  rows.forEach((row) => sheet.addRow(row))
  autoFitColumns(sheet)
}

function addTopGamesSheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  if (statistics.topMostPlayedGames.length === 0) return

  const sheet = workbook.addWorksheet(t('statistics.export.topGames'))
  addHeaderRow(sheet, [t('statistics.export.rank'), t('statistics.export.game'), t('statistics.export.totalDuration')])

  statistics.topMostPlayedGames.forEach((game, index) => {
    sheet.addRow([index + 1, game.gameName, formatDurationWords(game.playtimeSeconds, t)])
  })

  autoFitColumns(sheet)
}

export async function exportStatisticsToXlsx(
  statistics: UserStatistics,
  interval: 'week' | 'month' | 'year' | 'all',
  t: any
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GameWatch'
  workbook.created = new Date()

  addOverviewSheet(workbook, t, interval, statistics)
  addDailyPlaytimeSheet(workbook, t, statistics)
  addDistributionSheet(workbook, t, t('statistics.userStats.genreDistribution'), t('statistics.export.genre'), statistics.genreDistribution)
  addDistributionSheet(workbook, t, t('statistics.userStats.platformDistribution'), t('statistics.export.platform'), statistics.platformDistribution || {})
  addHourlyActivitySheet(workbook, t, statistics)
  addDayOfWeekSheet(workbook, t, statistics)
  addHighlightsSheet(workbook, t, statistics)
  addTopGamesSheet(workbook, t, statistics)

  await downloadWorkbook(workbook, `gamewatch-statistics-${interval}-${new Date().toISOString().split('T')[0]}.xlsx`)
}

export async function exportGameStatisticsToXlsx(
  statistics: GameStatistics,
  sessions: SessionDetail[],
  t: any
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GameWatch'
  workbook.created = new Date()

  const overview = workbook.addWorksheet(t('statistics.export.overview'))
  addHeaderRow(overview, [t('statistics.export.metric'), t('statistics.export.value')])
  overview.addRow([t('statistics.export.exportDate'), new Date().toLocaleString()])
  overview.addRow([t('statistics.gameStats.title'), statistics.gameName])
  overview.addRow([t('statistics.gameStats.totalPlayTime'), formatDurationWords(statistics.totalPlayTimeSeconds, t)])
  overview.addRow([t('statistics.gameStats.totalSessions'), statistics.totalSessions])
  overview.addRow([t('statistics.gameStats.averageSession'), formatDurationWords(Math.round(statistics.averageSessionTimeSeconds), t)])
  overview.addRow([t('statistics.gameStats.longestSession'), formatDurationWords(statistics.longestSessionSeconds, t)])
  overview.addRow([t('statistics.gameStats.replays'), statistics.replaysCount])
  if (statistics.firstStartedDate) overview.addRow([t('statistics.gameStats.firstStarted'), new Date(statistics.firstStartedDate).toLocaleDateString()])
  if (statistics.lastPlayedDate) overview.addRow([t('statistics.gameStats.lastPlayed'), new Date(statistics.lastPlayedDate).toLocaleDateString()])
  if (statistics.longestCompletionSeconds) overview.addRow([t('statistics.gameStats.longestCompletion'), formatDurationWords(statistics.longestCompletionSeconds, t)])
  if (statistics.shortestCompletionSeconds) overview.addRow([t('statistics.gameStats.shortestCompletion'), formatDurationWords(statistics.shortestCompletionSeconds, t)])
  autoFitColumns(overview)

  const sessionSheet = workbook.addWorksheet(t('statistics.gameStats.sessionHistory'))
  addHeaderRow(sessionSheet, [
    t('statistics.gameStats.sessionNumber'),
    t('statistics.gameStats.playthrough'),
    t('statistics.export.date'),
    t('statistics.gameStats.duration'),
    t('statistics.gameStats.pauses')
  ])
  sessions.forEach((session) => {
    sessionSheet.addRow([
      session.sessionNumber,
      session.playthroughTitle || t('statistics.gameStats.na'),
      session.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : t('statistics.gameStats.na'),
      formatDurationWords(session.sessionTimeSeconds, t),
      session.pauseCount || 0
    ])
  })
  autoFitColumns(sessionSheet)

  await downloadWorkbook(workbook, `gamewatch-${statistics.gameName.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.xlsx`)
}
