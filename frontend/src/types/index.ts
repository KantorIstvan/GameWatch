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
  ratingsCount?: number
  esrbRating?: string
  tags?: string
  developers?: string
  publishers?: string
  website?: string
  alternativeNames?: string
  description?: string
  slug?: string
  /** IGDB's average time to beat, in seconds. */
  averageCompletionSeconds?: number
  /** This app's own shrunk community score - only populated by the catalog endpoints. */
  communityRatingScore?: number | null
  communityRatingCount?: number
}

/**
 * A game's catalog page. Addressed by `externalId`, because it may not exist here at all:
 * `id` is null until someone rates or reviews it and the catalog row gets created.
 */
export interface CatalogGame extends Omit<Game, 'id' | 'externalId'> {
  id: number | null
  externalId: number
}

export interface Playthrough {
  id: number
  gameId: number
  gameName: string
  gameBannerImageUrl?: string
  name: string
  title?: string
  playthroughType: 'story' | 'speedrun' | 'casual' | '100%'
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
  sessionStartTime?: string
  sessionStartDurationSeconds?: number
  dominantColor1?: string
  dominantColor2?: string
  bannerImageUrl?: string
  rating?: number
  ratingsCount?: number
  esrbRating?: string
  genres?: string
  tags?: string
  platforms?: string
  developers?: string
  publishers?: string
  website?: string
  alternativeNames?: string[]
  description?: string
  slug?: string
  releaseDate?: string
}

/**
 * A hit from the catalog's search, which searches all of IGDB rather than this app's own
 * rows. `id` is the IGDB id - the only id most of these have, since nobody here has
 * necessarily added them.
 */
export interface GameSearchResult {
  id: number
  name: string
  bannerImageUrl?: string
  description?: string
  releaseDate?: string
  rating?: number
  ratingsCount?: number
  genres?: string
  platforms?: string
  developers?: string
  publishers?: string
  tags?: string
  slug?: string
  website?: string
  esrbRating?: string
  alternativeNames?: string
  averageCompletionSeconds?: number
}

export interface GameStatistics {
  gameId: number
  externalId: number
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
  consistencyStats?: ConsistencyStats
  backlogStats?: BacklogStats
  trendStats?: TrendStats
  favoriteDeveloper?: string
  favoritePublisher?: string
}

export interface ActivityEvent {
  id: string
  actorHandle: string | null
  actorDisplayName: string | null
  actorPictureUrl: string | null
  type: 'FINISHED' | 'DROPPED' | 'PICKED_UP' | 'STARTED'
  gameId: number
  gameName: string
  bannerImageUrl: string | null
  playtimeSeconds: number
  occurredAt: string
}

export interface GameCommunity {
  gameId: number
  gameName: string
  bannerImageUrl: string | null
  playerCount: number
  finisherCount: number
  /** Null until enough people have played for an aggregate to describe a group. */
  medianCompletionSeconds: number | null
  fastestCompletionSeconds: number | null
  slowestCompletionSeconds: number | null
  /** IGDB's own average time-to-beat, for comparison against what was measured here. */
  typicalCompletionSeconds: number | null
  dropRatePercentage: number | null
  medianSecondsBeforeDropping: number | null
  hasEnoughDataToAggregate: boolean
  minimumPlayersRequired: number
  rating: GameRatingSummary
}

/** One playthrough category's community-measured time to beat - see {@link GameTimeToBeat}. */
export interface TimeToBeatCategory {
  /** Null until enough distinct players have logged one for an average to describe a group. */
  averageSeconds: number | null
  sampleSize: number
  playerCount: number
  hasEnoughData: boolean
  minimumPlayersRequired: number
}

/**
 * The community's own measured time to beat for a game, broken out by playthrough type -
 * this app's replacement for IGDB's single self-reported average.
 */
export interface GameTimeToBeat {
  gameId: number
  story: TimeToBeatCategory
  hundredPercent: TimeToBeatCategory
  speedrun: TimeToBeatCategory
}

export interface GameReview {
  id: number
  authorHandle: string | null
  authorDisplayName: string | null
  authorPictureUrl: string | null
  /** The author's own score, when they left one. */
  authorScore: number | null
  authorPlaytimeSeconds: number
  authorFinished: boolean
  body: string
  containsSpoilers: boolean
  language: string | null
  helpfulCount: number
  viewerFoundHelpful: boolean
  /** The viewer's own review - the one they can edit and delete. */
  ownReview: boolean
  createdAt: string
  /** The conversation under the review, oldest first. Flat - replies are never replied to. */
  replies: ReviewReply[]
}

export interface ReviewReply {
  id: number
  authorHandle: string | null
  authorDisplayName: string | null
  authorPictureUrl: string | null
  body: string
  /** True for the reply's author and nobody else - not even the author of the review. */
  viewerCanDelete: boolean
  createdAt: string
}

export interface GameRatingSummary {
  gameId: number
  ratingCount: number
  /** Null when nobody has rated it, so unrated stays distinct from rated badly. */
  averageScore: number | null
  bayesianScore: number | null
  distribution: Record<number, number>
  verifiedCount: number
  verifiedAverageScore: number | null
  finisherCount: number
  finisherAverageScore: number | null
  yourScore: number | null
}

export interface ProfileLibrary {
  totalPlaytimeSeconds: number
  gamesInLibrary: number
  gamesCompleted: number
  totalSessions: number
  topGames: GameRanking[]
  /** How many games this user has personally rated. */
  ratingsGiven: number
  /** Score (1-10) to how many times this user has given it, for their own histogram. */
  ratingDistribution: Record<number, number>
  /** This user's most recent written reviews, newest first. */
  recentReviews: ProfileReview[]
}

/**
 * One review, as it appears on its author's own profile.
 *
 * Leaner than {@link GameReview}: the author is implicitly whoever owns this profile, so
 * the game being reviewed is the interesting subject here instead of author identity.
 */
export interface ProfileReview {
  gameId: number
  /** IGDB's id - the catalog's address for this game, since most have no row here. */
  gameExternalId: number | null
  gameName: string
  gameBannerImageUrl: string | null
  /** The author's own score for this game, when they left one. */
  score: number | null
  body: string
  containsSpoilers: boolean
  createdAt: string
}

/**
 * One game on a wishlist. Addressed by `externalId` as well as `gameId` - a wishlist
 * button on a catalog search result only ever has the IGDB id on hand, the same as
 * {@link CatalogGame}.
 */
export interface WishlistEntry {
  gameId: number
  externalId: number
  gameName: string
  bannerImageUrl?: string
  releaseDate?: string
  addedAt: string
}

/**
 * One link on a profile, as far as either side of the API needs to know about it.
 *
 * Carries only the URL - which platform it is (X, GitHub, a plain website...) is worked
 * out client-side from the host by `lib/socialLinks.ts`, not decided or stored
 * server-side.
 */
export interface ProfileLink {
  url: string
}

export interface PublicProfile {
  handle: string
  displayName: string | null
  bio: string | null
  profilePictureUrl: string | null
  joinedDate: string
  /** Part of identity, like the avatar - visible whenever the profile itself is. */
  links: ProfileLink[]
  followerCount: number
  followingCount: number
  viewerIsFollowing: boolean
  viewerRequestPending: boolean
  ownProfile: boolean
  /** Null when the viewer may see the profile but not the library behind it. */
  library: ProfileLibrary | null
  /** Null when the viewer may see the profile but not the wishlist behind it. */
  wishlist: WishlistEntry[] | null
}

/**
 * One row in a list of people - a search result, a follower, someone being followed.
 *
 * Carries the viewer's own relationship to that person, so a follow button in a row starts
 * in the right state instead of defaulting to "Follow" for someone already followed.
 */
export interface ProfileSummary {
  /**
   * Null for an account that has never claimed one.
   *
   * Such a person can still follow others and so still turns up in these lists, but has no
   * address - nothing to link to, and nothing the follow endpoints can be keyed by.
   */
  handle: string | null
  displayName: string | null
  profilePictureUrl: string | null
  followerCount: number
  followingCount: number
  viewerIsFollowing: boolean
  viewerRequestPending: boolean
  /** The viewer's own row, which gets no follow button - you cannot follow yourself. */
  ownProfile: boolean
}

export interface FollowState {
  handle: string
  following: boolean
  /** True while a request to a followers-only profile is waiting to be answered. */
  requestPending: boolean
  followerCount: number
  followingCount: number
}

export interface FollowPerson {
  followId: number
  handle: string
  displayName: string | null
  profilePictureUrl: string | null
  createdAt: string
}

/** Kinds of thing the server records against an account. */
export type ServerNotificationType =
  | 'FOLLOW_REQUEST'
  | 'FOLLOW_ACCEPTED'
  | 'NEW_FOLLOWER'
  | 'REVIEW_REPLY'
  | 'REVIEW_HELPFUL'

/**
 * One thing that happened to the viewer.
 *
 * Carries no message: the wording lives in the translation files, so a notification from
 * last month still reads in whatever language is selected today.
 */
export interface ServerNotification {
  id: number
  type: ServerNotificationType
  actorHandle: string | null
  actorDisplayName: string | null
  actorPictureUrl: string | null
  gameId: number | null
  /** IGDB's id, which is the only address a catalog page has. */
  gameExternalId: number | null
  gameName: string | null
  reviewId: number | null
  read: boolean
  createdAt: string
}

export interface NotificationFeed {
  notifications: ServerNotification[]
  /** Counted server-side, so it can exceed the length of the capped list above. */
  unreadCount: number
}

/** Who may see part of a profile. Health data is never shareable and has no setting. */
export type Visibility = 'PRIVATE' | 'FOLLOWERS' | 'PUBLIC'

/**
 * Whether the account has the identity the rest of the app assumes it has.
 *
 * `completed` is derived server-side from the two mandatory fields rather than stored as a
 * flag, so it can never claim an account is ready when the fields say otherwise.
 */
export interface OnboardingStatus {
  completed: boolean
  /** Null until claimed. */
  handle: string | null
  displayName: string | null
  /** A free handle to prefill the form with. Null once a handle is claimed. */
  suggestedHandle: string | null
  /** The Auth0 nickname - a prefill, never an identity. */
  suggestedDisplayName: string | null
}

export interface OnboardingRequest {
  handle: string
  displayName: string
}

export interface ProfileSettings {
  /** Null until the user claims one. */
  handle: string | null
  displayName: string | null
  bio: string | null
  profileVisibility: Visibility
  libraryVisibility: Visibility
  wishlistVisibility: Visibility
  /** Read-only here: the picture is changed through the avatar upload endpoint. */
  profilePictureUrl: string | null
  /** Sent and returned as the whole set, in display order - saving replaces all of it. */
  links: ProfileLink[]
}

export interface TrendStats {
  /** Null for the all-time view, which has no preceding period. */
  previousPeriodPlaytimeSeconds: number | null
  /** Null when the previous period was empty. */
  playtimeChangePercentage: number | null
  weekdayPlaytimeSeconds: number
  weekendPlaytimeSeconds: number
  weekendIntensityRatio: number | null
  topThreeSharePercentage: number
  varietyScore: number
  playthroughsDropped: number
  playthroughsCompleted: number
  dropRatePercentage: number | null
  medianSecondsBeforeDropping: number | null
}

export interface BacklogStats {
  gamesInLibrary: number
  gamesStarted: number
  gamesPastFirstHour: number
  gamesFinished: number
  gamesNeverStarted: number
  /** Null when no game in the library has ever been played. */
  medianShelfTimeDays: number | null
  gamesAddedRecently: number
  gamesFinishedRecently: number
  backlogWindowMonths: number
  stalePlaythroughs: GameRanking[]
}

export interface ConsistencyStats {
  /** Null when the selected period does not contain today. */
  currentStreakDays: number | null
  longestStreakDays: number
  daysPlayed: number
  daysInPeriod: number
  consistencyPercentage: number
  longestGapDays: number
  medianSessionSeconds: number
  percentile90SessionSeconds: number
  sessionsPerActiveDay: number
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
  /** Trailing seven-day mean, for the trend line on the daily chart. */
  rollingAverageSeconds?: number | null
}

/**
 * One game a profile owner has rated, and the score they gave it - a "Ratings" tab row.
 *
 * The review fields are undefined whenever this user rated the game without writing
 * anything - a rating and a written review are recorded separately, and most rated games
 * never get a review.
 */
export interface GameRatingEntry {
  gameId: number
  /** IGDB's id - the catalog's address for this game, since most have no row here. */
  externalId?: number
  gameName: string
  bannerImageUrl?: string
  score: number
  ratedAt: string
  reviewBody?: string
  reviewCreatedAt?: string
  containsSpoilers: boolean
}

export interface GameRanking {
  gameId: number
  /** IGDB's id - the catalog's address for this game, since most have no row here. */
  externalId?: number
  gameName: string
  bannerImageUrl?: string
  playtimeSeconds: number
  daysToComplete?: number
  /** Only populated for stale playthroughs, where it is the point of the entry. */
  daysSinceLastPlayed?: number
  startDate?: string
  endDate?: string
  badges?: string[]
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
  firstDayOfWeek?: 'MONDAY' | 'SUNDAY'
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
