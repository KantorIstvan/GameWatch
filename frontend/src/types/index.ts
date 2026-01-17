export interface Game {
  id: number
  name: string
  externalId?: string
  coverImage?: string
  bannerImageUrl?: string
  dominantColor?: string
  dominantColor1?: string
  dominantColor2?: string
  totalPlaytime?: number
  totalPlaytimeSeconds?: number
  status?: 'active' | 'completed' | 'dropped' | 'started'
  activeSessions?: number
  playthroughCount?: number
  sessionCount?: number
  lastPlayedDate?: string
  genres?: string
  platforms?: string
  releaseDate?: string
  rating?: number
  ratingTop?: number
  ratingsCount?: number
  metacritic?: number
  metacriticUrl?: string
  esrbRating?: string
  tags?: string
  developers?: string
  publishers?: string
  website?: string
  redditUrl?: string
  redditName?: string
  redditCount?: number
  redditDescription?: string
  alternativeNames?: string
  description?: string
  slug?: string
  updated?: string
}

export interface Playthrough {
  id: number
  gameId: number
  gameName: string
  gameBannerImageUrl?: string
  name: string
  title?: string
  playthroughType: 'story' | 'speedrun' | 'casual' | '100%' | '100_percent'
  platform?: string
  totalPlaytimeSeconds: number
  durationSeconds?: number
  startedAt?: string
  isActive: boolean
  isPaused?: boolean
  isCompleted: boolean
  isDropped?: boolean
  sessionCount: number
  startDate?: string
  endDate?: string
  lastPlayedAt?: string | null
  droppedAt?: string | null
  pickedUpAt?: string | null
  completionDate?: string
  importedFromPlaythroughId?: number
  importedDurationSeconds?: number
  lastSessionHistoryId?: number
  dominantColor1?: string
  dominantColor2?: string
  bannerImageUrl?: string
  rating?: number
  ratingTop?: number
  ratingsCount?: number
  metacritic?: number
  metacriticUrl?: string
  esrbRating?: string
  genres?: string
  tags?: string
  platforms?: string
  developers?: string
  publishers?: string
  website?: string
  redditUrl?: string
  redditName?: string
  redditCount?: number
  redditDescription?: string
  alternativeNames?: string[]
  description?: string
  slug?: string
  updated?: string
  releaseDate?: string
}

export interface GameSearchResult {
  id: string
  name: string
  bannerImageUrl?: string
  rating?: number
  genres?: string[]
}

export interface GameStatistics {
  gameId: number
  gameName: string
  gameBannerImageUrl?: string
  gameAddedDate?: string
  totalPlayTimeSeconds: number
  totalSessions: number
  averageSessionTimeSeconds: number
  longestSessionSeconds: number
  replaysCount: number
  firstStartedDate?: string
  lastPlayedDate?: string
  longestCompletionSeconds?: number
  shortestCompletionSeconds?: number
  sessions: SessionDetail[]
}

export interface SessionDetail {
  sessionId?: number
  playthroughId: number
  sessionNumber: number
  sessionDate: string
  playthroughTitle: string
  sessionTimeSeconds: number
  pauseCount: number
  startedAt?: string
  endedAt?: string
}

export interface UserStatistics {
  totalPlaytimeSeconds: number
  averageSessionPlaytimeSeconds: number
  gamesCompleted: number
  gamesInProgress: number
  longestSessionSeconds: number
  totalSessionCount: number
  totalGamesCount: number
  timeOfDayStats: TimeOfDayStats
  dailyPlaytime: DailyPlaytime[]
  genreDistribution: Record<string, number>
  platformDistribution: Record<string, number>
  favoriteGame?: GameRanking
  longestToCompleteGame?: GameRanking
  fastestToCompleteGame?: GameRanking
  topMostPlayedGames: GameRanking[]
  dayOfWeekPlaytime: Record<string, number>
  dayOfWeekTotalPlaytime: Record<string, number>
  libraryCompletionPercentage: number
  favoriteDeveloper?: string
  favoritePublisher?: string
}

export interface TimeOfDayStats {
  dawnSeconds: number
  morningSeconds: number
  noonSeconds: number
  afternoonSeconds: number
  eveningSeconds: number
  nightSeconds: number
  hourlyDistribution: Record<number, number>
}

export interface DailyPlaytime {
  date: string
  playtimeSeconds: number
}

export interface GameRanking {
  gameId: number
  gameName: string
  bannerImageUrl?: string
  playtimeSeconds: number
  daysToComplete?: number
  startDate?: string
  endDate?: string
}

export interface GameRecommendation {
  externalId: string
  name: string
  bannerImageUrl?: string
  platforms: string[]
  similarityScore: number
  matchingDevelopers: string[]
  matchingPublishers: string[]
  matchingGenres: string[]
  matchingTags: string[]
}

export interface PlatformInfo {
  name: string
  color: string
  variants: string[]
}

export const PLATFORMS: Record<string, PlatformInfo> = {
  playstation: {
    name: 'PlayStation',
    color: '#006FCD',
    variants: ['PlayStation', 'PlayStation 2', 'PlayStation 3', 'PlayStation 4', 'PlayStation 5', 'PS Vita', 'PSP']
  },
  xbox: {
    name: 'Xbox',
    color: '#107C10',
    variants: ['Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series S/X']
  },
  nintendo: {
    name: 'Nintendo',
    color: '#E60012',
    variants: ['Nintendo Switch', 'Nintendo 3DS', 'Wii U', 'Wii', 'GameCube', 'Nintendo 64', 'Game Boy', 'Game Boy Advance', 'Nintendo DS']
  },
  pc: {
    name: 'PC',
    color: '#FDB813',
    variants: ['PC', 'Windows', 'Linux', 'macOS']
  },
  mobile: {
    name: 'Mobile',
    color: '#00C853',
    variants: ['iOS', 'Android', 'Mobile']
  },
  other: {
    name: 'Other',
    color: '#9E9E9E',
    variants: ['Dreamcast', 'Sega Genesis', 'SNES', 'NES', 'Atari']
  }
}

export function getPlatformColor(platformName?: string): string {
  if (!platformName) return PLATFORMS.other.color
  
  const lowerPlatform = platformName.toLowerCase()
  
  for (const info of Object.values(PLATFORMS)) {
    if (info.variants.some(variant => lowerPlatform.includes(variant.toLowerCase()))) {
      return info.color
    }
  }
  
  return PLATFORMS.other.color
}

export function getPlatformColorVariant(platformName?: string): string {
  if (!platformName) return PLATFORMS.other.color
  
  const lowerPlatform = platformName.toLowerCase()
  
  if (lowerPlatform.includes('playstation 5') || lowerPlatform.includes('ps5')) {
    return '#0070E0' 
  } else if (lowerPlatform.includes('playstation 4') || lowerPlatform.includes('ps4')) {
    return '#005BB5' 
  } else if (lowerPlatform.includes('playstation 3') || lowerPlatform.includes('ps3')) {
    return '#004A9C'
  } else if (lowerPlatform.includes('playstation 2') || lowerPlatform.includes('ps2')) {
    return '#003876' 
  } else if (lowerPlatform.includes('playstation') || lowerPlatform.includes('ps vita') || lowerPlatform.includes('psp')) {
    return '#002654' 
  }
  
  else if (lowerPlatform.includes('xbox series')) {
    return '#13A10E' 
  } else if (lowerPlatform.includes('xbox one')) {
    return '#107C10' 
  } else if (lowerPlatform.includes('xbox 360')) {
    return '#0D6B0D' 
  } else if (lowerPlatform.includes('xbox')) {
    return '#0A570A'
  }
  
  else if (lowerPlatform.includes('nintendo switch') || lowerPlatform.includes('switch')) {
    return '#E60012' 
  } else if (lowerPlatform.includes('wii u')) {
    return '#CC000F' 
  } else if (lowerPlatform.includes('wii')) {
    return '#B3000D' 
  } else if (lowerPlatform.includes('gamecube')) {
    return '#99000A' 
  } else if (lowerPlatform.includes('nintendo 64') || lowerPlatform.includes('n64')) {
    return '#800008' 
  } else if (lowerPlatform.includes('nintendo')) {
    return '#CC000F' 
  }
  
  else if (lowerPlatform.includes('windows') || lowerPlatform.includes('pc')) {
    return '#FDB813' 
  } else if (lowerPlatform.includes('linux')) {
    return '#FCA311' 
  } else if (lowerPlatform.includes('macos') || lowerPlatform.includes('mac')) {
    return '#E89B0C' 
  }
  
  else if (lowerPlatform.includes('ios')) {
    return '#00E676'
  } else if (lowerPlatform.includes('android')) {
    return '#00C853' 
  } else if (lowerPlatform.includes('mobile')) {
    return '#00B248' 
  }
  
  return getPlatformColor(platformName)
}

export interface User {
  id: number
  auth0UserId: string
  email: string
  username: string
  profilePictureUrl?: string
  age?: number
  timezone?: string
  createdAt: string
  updatedAt: string
}

export function normalizePlatformName(platformName?: string): string {
  if (!platformName) return 'Unknown'
  
  const lowerPlatform = platformName.toLowerCase()
  
  for (const info of Object.values(PLATFORMS)) {
    if (info.variants.some(variant => lowerPlatform.includes(variant.toLowerCase()))) {
      return info.name
    }
  }
  
  return platformName
}
