import ExcelJS from 'exceljs'
import { UserStatistics, GameStatistics, GameRanking, SessionDetail } from '../types'
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

/**
 * A two-column Metric/Value sheet, the same shape the overview sheet uses. The caller
 * assembles the rows so an absent optional stat can be skipped entirely rather than
 * writing an empty cell, and an empty set of rows produces no sheet at all.
 */
function addMetricSheet(
  workbook: ExcelJS.Workbook,
  t: any,
  sheetName: string,
  rows: [string, string | number][]
) {
  if (rows.length === 0) return

  const sheet = workbook.addWorksheet(sheetName)
  addHeaderRow(sheet, [t('statistics.export.metric'), t('statistics.export.value')])
  rows.forEach((row) => sheet.addRow(row))
  autoFitColumns(sheet)
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

  // The trailing seven-day mean is what the heatmap tooltip surfaces on the page, so it
  // travels with the daily numbers here - but only when the backend actually sent it.
  const hasRollingAverage = entries.some(
    (dp) => dp.rollingAverageSeconds !== null && dp.rollingAverageSeconds !== undefined
  )

  const sheet = workbook.addWorksheet(t('statistics.userStats.dailyPlaytime'))
  addHeaderRow(sheet, [
    t('statistics.export.date'),
    t('statistics.export.totalDuration'),
    t('statistics.userStats.hours'),
    ...(hasRollingAverage
      ? [t('statistics.trends.sevenDayAverage'), t('statistics.export.rollingAverageHours')]
      : [])
  ])

  entries.forEach((dp) => {
    const rollingSeconds = dp.rollingAverageSeconds
    const hasRolling = rollingSeconds !== null && rollingSeconds !== undefined
    sheet.addRow([
      new Date(dp.date).toLocaleDateString(),
      formatDurationWords(dp.playtimeSeconds, t),
      Number((dp.playtimeSeconds / 3600).toFixed(2)),
      ...(hasRollingAverage
        ? [
            hasRolling ? formatDurationWords(Math.round(rollingSeconds), t) : '',
            hasRolling ? Number((rollingSeconds / 3600).toFixed(2)) : ''
          ]
        : [])
    ])
  })

  sheet.getColumn(3).numFmt = '0.00'
  if (hasRollingAverage) sheet.getColumn(5).numFmt = '0.00'
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

/**
 * The six named parts of the day the page draws as a pie, which the hourly sheet cannot
 * stand in for: the buckets are the aggregate the chart is actually built from, and the
 * hour ranges that define them are not derivable from a list of 24 hours.
 */
function addTimeOfDaySheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  const stats = statistics.timeOfDayStats
  if (!stats) return

  const buckets: [string, string, number][] = [
    [t('statistics.userStats.dawn'), '4-7', stats.dawnSeconds],
    [t('statistics.userStats.morning'), '7-12', stats.morningSeconds],
    [t('statistics.userStats.noon'), '12-13', stats.noonSeconds],
    [t('statistics.userStats.afternoon'), '13-18', stats.afternoonSeconds],
    [t('statistics.userStats.evening'), '18-22', stats.eveningSeconds],
    [t('statistics.userStats.night'), '22-4', stats.nightSeconds]
  ]
  if (buckets.every(([, , seconds]) => !seconds)) return

  const sheet = workbook.addWorksheet(t('statistics.userStats.timeOfDayDistribution'))
  addHeaderRow(sheet, [
    t('statistics.export.timeOfDay'),
    t('statistics.export.hourRange'),
    t('statistics.export.totalDuration'),
    t('statistics.userStats.hours')
  ])

  buckets.forEach(([label, range, seconds]) => {
    sheet.addRow([label, range, formatDurationWords(seconds || 0, t), Number(((seconds || 0) / 3600).toFixed(2))])
  })

  sheet.getColumn(4).numFmt = '0.00'
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
    t('statistics.userStats.avgPerDay')
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

/**
 * How regularly the period was played rather than how much - streaks, gaps and the shape
 * of a normal sitting. Mirrors the guard the page's own Consistency section uses, so a
 * period with no days in it produces no sheet.
 */
function addConsistencySheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  const stats = statistics.consistencyStats
  if (!stats || !stats.daysInPeriod) return

  const rows: [string, string | number][] = []

  // Only meaningful while the period still contains today.
  if (stats.currentStreakDays !== null && stats.currentStreakDays !== undefined) {
    rows.push([
      t('statistics.consistency.currentStreak'),
      t('statistics.consistency.dayCount', { count: stats.currentStreakDays })
    ])
  }

  rows.push([
    t('statistics.consistency.longestStreak'),
    t('statistics.consistency.dayCount', { count: stats.longestStreakDays })
  ])
  rows.push([t('statistics.consistency.daysPlayed'), stats.daysPlayed])
  rows.push([t('statistics.export.daysInPeriod'), stats.daysInPeriod])
  rows.push([t('statistics.consistency.consistency'), `${Math.round(stats.consistencyPercentage)}%`])
  rows.push([
    t('statistics.consistency.longestGap'),
    t('statistics.consistency.dayCount', { count: stats.longestGapDays })
  ])
  rows.push([t('statistics.consistency.medianSession'), formatDurationWords(stats.medianSessionSeconds, t)])
  rows.push([t('statistics.consistency.longSession'), formatDurationWords(stats.percentile90SessionSeconds, t)])
  rows.push([t('statistics.consistency.sessionsPerActiveDay'), Number(stats.sessionsPerActiveDay.toFixed(1))])

  addMetricSheet(workbook, t, t('statistics.consistency.title'), rows)
}

/**
 * Direction and shape of play: whether the period beat the one before it, how it splits
 * across the week, how spread out it is over the library, and what became of the games
 * that were abandoned.
 */
function addTrendsSheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  const stats = statistics.trendStats
  if (!stats) return

  const rows: [string, string | number][] = []

  // Absent for the all-time view, which has no preceding period to compare against.
  if (stats.previousPeriodPlaytimeSeconds !== null && stats.previousPeriodPlaytimeSeconds !== undefined) {
    rows.push([
      t('statistics.export.previousPeriodPlaytime'),
      formatDurationWords(stats.previousPeriodPlaytimeSeconds, t)
    ])
  }
  if (stats.playtimeChangePercentage !== null && stats.playtimeChangePercentage !== undefined) {
    const change = Math.round(stats.playtimeChangePercentage)
    rows.push([t('statistics.trends.vsPreviousPeriod'), `${change > 0 ? '+' : ''}${change}%`])
  }

  rows.push([t('statistics.export.weekdayPlaytime'), formatDurationWords(stats.weekdayPlaytimeSeconds, t)])
  rows.push([t('statistics.export.weekendPlaytime'), formatDurationWords(stats.weekendPlaytimeSeconds, t)])

  if (stats.weekendIntensityRatio !== null && stats.weekendIntensityRatio !== undefined) {
    rows.push([t('statistics.trends.weekendIntensity'), stats.weekendIntensityRatio.toFixed(1)])
  }

  rows.push([t('statistics.trends.varietyScore'), Math.round(stats.varietyScore)])
  rows.push([t('statistics.trends.topThreeShare'), `${Math.round(stats.topThreeSharePercentage)}%`])
  rows.push([t('statistics.export.playthroughsCompleted'), stats.playthroughsCompleted])
  rows.push([t('statistics.export.playthroughsDropped'), stats.playthroughsDropped])

  if (stats.dropRatePercentage !== null && stats.dropRatePercentage !== undefined) {
    rows.push([t('statistics.trends.dropRate'), `${Math.round(stats.dropRatePercentage)}%`])
  }
  if (stats.medianSecondsBeforeDropping !== null && stats.medianSecondsBeforeDropping !== undefined) {
    rows.push([
      t('statistics.trends.medianBeforeDropping'),
      formatDurationWords(stats.medianSecondsBeforeDropping, t)
    ])
  }

  addMetricSheet(workbook, t, t('statistics.trends.title'), rows)
}

/**
 * The shape of the library rather than of the selected period - the funnel from owned to
 * finished, plus how fast the backlog is growing.
 */
function addBacklogSheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  const stats = statistics.backlogStats
  if (!stats || !stats.gamesInLibrary) return

  const rows: [string, string | number][] = [
    [t('statistics.backlog.owned'), stats.gamesInLibrary],
    [t('statistics.backlog.started'), stats.gamesStarted],
    [t('statistics.backlog.pastFirstHour'), stats.gamesPastFirstHour],
    [t('statistics.backlog.finished'), stats.gamesFinished],
    [t('statistics.backlog.neverStarted'), stats.gamesNeverStarted]
  ]

  // Null until at least one game in the library has ever been played.
  if (stats.medianShelfTimeDays !== null && stats.medianShelfTimeDays !== undefined) {
    rows.push([
      t('statistics.backlog.medianShelfTime'),
      t('statistics.consistency.dayCount', { count: stats.medianShelfTimeDays })
    ])
  }

  rows.push([
    t('statistics.backlog.addedRecently', { months: stats.backlogWindowMonths }),
    stats.gamesAddedRecently
  ])
  rows.push([
    t('statistics.backlog.finishedRecently', { months: stats.backlogWindowMonths }),
    stats.gamesFinishedRecently
  ])
  rows.push([t('statistics.export.backlogWindow'), stats.backlogWindowMonths])

  addMetricSheet(workbook, t, t('statistics.backlog.title'), rows)
}

/** The unfinished playthroughs the backlog section lists as drifted away from. */
function addStalePlaythroughsSheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  const entries = statistics.backlogStats?.stalePlaythroughs || []
  if (entries.length === 0) return

  const sheet = workbook.addWorksheet(t('statistics.export.stalePlaythroughs'))
  addHeaderRow(sheet, [
    t('statistics.export.game'),
    t('statistics.export.totalDuration'),
    t('statistics.userStats.hours'),
    t('statistics.export.daysSinceLastPlayed')
  ])

  entries.forEach((game) => {
    sheet.addRow([
      game.gameName,
      formatDurationWords(game.playtimeSeconds, t),
      Number((game.playtimeSeconds / 3600).toFixed(2)),
      game.daysSinceLastPlayed ?? ''
    ])
  })

  sheet.getColumn(3).numFmt = '0.00'
  autoFitColumns(sheet)
}

/**
 * One highlight row. The run's own start/end dates and the extra categories a game leads
 * in are both carried on the ranking and both shown on the page, so neither is dropped
 * here - each stays blank rather than absent when the backend did not populate it.
 */
function highlightRow(t: any, category: string, game: GameRanking): (string | number)[] {
  return [
    category,
    game.gameName,
    game.daysToComplete ?? '',
    formatDurationWords(game.playtimeSeconds, t),
    game.startDate ? new Date(game.startDate).toLocaleDateString() : '',
    game.endDate ? new Date(game.endDate).toLocaleDateString() : '',
    game.badges?.map((badge) => t(`statistics.userStats.${badge}`)).join(', ') || ''
  ]
}

function addHighlightsSheet(workbook: ExcelJS.Workbook, t: any, statistics: UserStatistics) {
  const rows: (string | number)[][] = []

  if (statistics.favoriteGame) {
    rows.push(highlightRow(t, t('statistics.userStats.favoriteGame'), statistics.favoriteGame))
  }
  if (statistics.longestToCompleteGame) {
    rows.push(highlightRow(t, t('statistics.userStats.longestToComplete'), statistics.longestToCompleteGame))
  }
  if (statistics.fastestToCompleteGame) {
    rows.push(highlightRow(t, t('statistics.userStats.fastestCompletion'), statistics.fastestToCompleteGame))
  }
  if (rows.length === 0) return

  const sheet = workbook.addWorksheet(t('statistics.export.highlights'))
  addHeaderRow(sheet, [
    t('statistics.export.category'),
    t('statistics.export.game'),
    t('statistics.export.daysToComplete'),
    t('statistics.export.totalDuration'),
    t('statistics.export.startDate'),
    t('statistics.export.endDate'),
    t('statistics.export.badges')
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
  addConsistencySheet(workbook, t, statistics)
  addTrendsSheet(workbook, t, statistics)
  addBacklogSheet(workbook, t, statistics)
  addStalePlaythroughsSheet(workbook, t, statistics)
  addDailyPlaytimeSheet(workbook, t, statistics)
  addDistributionSheet(workbook, t, t('statistics.userStats.genreDistribution'), t('statistics.export.genre'), statistics.genreDistribution)
  addDistributionSheet(workbook, t, t('statistics.userStats.platformDistribution'), t('statistics.export.platform'), statistics.platformDistribution || {})
  addTimeOfDaySheet(workbook, t, statistics)
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
  if (statistics.gameAddedDate) overview.addRow([t('statistics.gameStats.gameAdded'), new Date(statistics.gameAddedDate).toLocaleDateString()])
  if (statistics.longestCompletionSeconds) overview.addRow([t('statistics.gameStats.longestCompletion'), formatDurationWords(statistics.longestCompletionSeconds, t)])
  if (statistics.shortestCompletionSeconds) overview.addRow([t('statistics.gameStats.shortestCompletion'), formatDurationWords(statistics.shortestCompletionSeconds, t)])
  autoFitColumns(overview)

  const sessionSheet = workbook.addWorksheet(t('statistics.gameStats.sessionHistory'))
  addHeaderRow(sessionSheet, [
    t('statistics.gameStats.sessionNumber'),
    t('statistics.gameStats.playthrough'),
    t('statistics.export.date'),
    t('statistics.gameStats.startTime'),
    t('statistics.gameStats.endTime'),
    t('statistics.gameStats.duration'),
    t('statistics.gameStats.pauses')
  ])
  sessions.forEach((session) => {
    sessionSheet.addRow([
      session.sessionNumber,
      session.playthroughTitle || t('statistics.gameStats.na'),
      session.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : t('statistics.gameStats.na'),
      // The table on the page shows when each sitting began and ended, not just how long
      // it ran - a session that ended at 3am reads very differently from one that did not.
      session.startedAt ? new Date(session.startedAt).toLocaleTimeString() : t('statistics.gameStats.na'),
      session.endedAt ? new Date(session.endedAt).toLocaleTimeString() : t('statistics.gameStats.na'),
      formatDurationWords(session.sessionTimeSeconds, t),
      session.pauseCount || 0
    ])
  })
  autoFitColumns(sessionSheet)

  await downloadWorkbook(workbook, `gamewatch-${statistics.gameName.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.xlsx`)
}
