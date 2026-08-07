import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { OnboardingRequest, ProfileSettings } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

let authToken: string | null = null

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (authToken) {
      // Set authorization header directly on the config.headers object
      config.headers['Authorization'] = `Bearer ${authToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error)
  }
)

export const setAuthToken = (token: string | null): void => {
  authToken = token
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common['Authorization']
  }
}

export const getAuthToken = (): string | null => {
  return authToken
}

export const gamesApi = {
  getAll: () => apiClient.get('/games'),
  getById: (id: number) => apiClient.get(`/games/${id}`),
  create: (data: any) => apiClient.post('/games', data),
  delete: (id: number) => apiClient.delete(`/games/${id}`),
  // Searches all of IGDB, not this app's rows. `limit` is for the catalog's search page,
  // which shows a full page of results; the add-a-game autocomplete omits it and gets the
  // shorter default that fits under an input.
  search: (query: string, limit?: number) =>
    apiClient.get('/games/search', { params: { query, limit } }),
  getDetails: (externalId: string) => apiClient.get(`/games/details/${externalId}`),
  getStatistics: (id: number) => apiClient.get(`/games/${id}/statistics`),
  // Catalog pages are addressed by IGDB id, since most games opened from search have no
  // row here. The GET returns a null `id` for those; the POST is what creates the row,
  // and is only called on the way into a rating or a review.
  getCatalogByExternalId: (externalId: number) =>
    apiClient.get(`/games/catalog/external/${externalId}`),
  resolveCatalogGame: (externalId: number) =>
    apiClient.post(`/games/catalog/external/${externalId}`),
}

export const playthroughsApi = {
  getAll: () => apiClient.get('/playthroughs'),
  getById: (id: number) => apiClient.get(`/playthroughs/${id}`),
  create: (data: any) => apiClient.post('/playthroughs', data),
  start: (id: number) => apiClient.post(`/playthroughs/${id}/start`),
  stop: (id: number) => apiClient.post(`/playthroughs/${id}/stop`),
  drop: (id: number) => apiClient.post(`/playthroughs/${id}/drop`),
  pickup: (id: number) => apiClient.post(`/playthroughs/${id}/pickup`),
  pause: (id: number) => apiClient.post(`/playthroughs/${id}/pause`),
  endSession: (id: number) => apiClient.post(`/playthroughs/${id}/end-session`),
  updateDuration: (id: number, durationSeconds: number) => 
    apiClient.post(`/playthroughs/${id}/duration`, { durationSeconds }),
  updatePlatform: (id: number, platform: string) => 
    apiClient.post(`/playthroughs/${id}/platform`, { platform }),
  updateTitle: (id: number, title: string) => 
    apiClient.post(`/playthroughs/${id}/title`, { title }),
  delete: (id: number) => apiClient.delete(`/playthroughs/${id}`),
  deleteSession: (playthroughId: number, sessionId: number) => 
    apiClient.delete(`/playthroughs/${playthroughId}/sessions/${sessionId}`),
  logManualSession: (id: number, startedAt: string, endedAt: string) =>
    apiClient.post(`/playthroughs/${id}/log-manual-session`, { startedAt, endedAt }),
  importSessions: (id: number, sourcePlaythroughId: number) =>
    apiClient.post(`/playthroughs/${id}/import-sessions`, { sourcePlaythroughId }),
}

export const statisticsApi = {
  getUserStatistics: (interval: 'week' | 'month' | 'year' | 'all' = 'all', date?: string, signal?: AbortSignal) =>
    apiClient.get('/statistics', { params: { interval, date }, signal }),
  getGameRecommendations: (limit: number = 5) =>
    apiClient.get('/statistics/recommendations', { params: { limit } }),
}

export const userApi = {
  getCurrentUser: () => apiClient.get('/users/me'),
  updateAge: (age: number) => apiClient.put('/users/me/age', { age }),
  updateTimezone: (timezone: string) => apiClient.put('/users/me/timezone', { timezone }),
  updateFirstDayOfWeek: (firstDayOfWeek: 'MONDAY' | 'SUNDAY') => 
    apiClient.put('/users/me/first-day-of-week', { firstDayOfWeek }),
  getOnboardingStatus: () => apiClient.get('/users/me/onboarding'),
  completeOnboarding: (request: OnboardingRequest) =>
    apiClient.post('/users/me/onboarding', request),
  getProfileSettings: () => apiClient.get('/users/me/profile'),
  updateProfileSettings: (settings: ProfileSettings) =>
    apiClient.put('/users/me/profile', settings),
  isHandleAvailable: (handle: string) =>
    apiClient.get('/users/me/handle-available', { params: { handle } }),
  // The blob is already downscaled by the picker - see AvatarPicker - so what goes over the
  // wire is an avatar rather than whatever came off the camera.
  uploadAvatar: (image: Blob) => {
    const form = new FormData()
    form.append('file', image, 'avatar')
    return apiClient.post('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteAvatar: () => apiClient.delete('/users/me/avatar'),
  deleteAccount: () => apiClient.delete('/users/me'),
}

export const ratingsApi = {
  getSummary: (gameId: number) => apiClient.get(`/games/${gameId}/rating`),
  rate: (gameId: number, score: number) => apiClient.put(`/games/${gameId}/rating`, { score }),
  removeRating: (gameId: number) => apiClient.delete(`/games/${gameId}/rating`),
}

export const communityApi = {
  getCommunityStats: (gameId: number) => apiClient.get(`/games/${gameId}/community`),
}

export const timeToBeatApi = {
  getTimeToBeat: (gameId: number) => apiClient.get(`/games/${gameId}/time-to-beat`),
}

export const reviewsApi = {
  getReviews: (gameId: number, sort: string, language?: string) =>
    apiClient.get(`/games/${gameId}/reviews`, { params: { sort, language } }),
  submitReview: (
    gameId: number,
    review: { body: string; containsSpoilers: boolean; language: string }
  ) => apiClient.put(`/games/${gameId}/reviews`, review),
  deleteReview: (gameId: number) => apiClient.delete(`/games/${gameId}/reviews`),
  toggleHelpful: (reviewId: number) => apiClient.post(`/reviews/${reviewId}/helpful`),
  // Both return the parent review, so a thread re-renders from the one response.
  addReply: (reviewId: number, body: string) =>
    apiClient.post(`/reviews/${reviewId}/replies`, { body }),
  deleteReply: (replyId: number) => apiClient.delete(`/reviews/replies/${replyId}`),
}

export const profilesApi = {
  getProfile: (handle: string) => apiClient.get(`/profiles/${handle}`),
  // Its own route rather than getProfile(ownHandle): an account that has not claimed a
  // handle still has a profile page, and that page is where the handle gets claimed.
  getMyProfile: () => apiClient.get('/profiles/me'),
  search: (query: string) => apiClient.get('/profiles/search', { params: { query } }),
  getFollowers: (handle: string) => apiClient.get(`/profiles/${handle}/followers`),
  getFollowing: (handle: string) => apiClient.get(`/profiles/${handle}/following`),
  getLibrary: (handle: string) => apiClient.get(`/profiles/${handle}/library`),
  getRatings: (handle: string) => apiClient.get(`/profiles/${handle}/ratings`),
}

export const feedApi = {
  // `before` is the occurredAt of the oldest event already on screen, for paging to the
  // next batch - a raw offset would not do, since events are merged from several sources
  // and re-sorted on every call rather than read off one indexed table. `actorHandles` is
  // joined into one comma-separated param rather than left as an array: axios's default
  // array serialization (`actorHandles[]=a&actorHandles[]=b`) does not match what Spring's
  // `List<String>` binding expects on the other end, while a single comma-separated value
  // does.
  getFeed: (limit?: number, scope?: 'following' | 'self', before?: string, actorHandles?: string[]) =>
    apiClient.get('/feed', {
      params: {
        limit,
        scope,
        before,
        actorHandles: actorHandles && actorHandles.length > 0 ? actorHandles.join(',') : undefined,
      },
    }),
}

export const notificationsApi = {
  // Every route is implicitly the caller's own - there is no parameter that could name
  // somebody else's notifications. All three writes return the list as it now stands, so
  // the header never has to ask again for what it just changed.
  getNotifications: (limit?: number) => apiClient.get('/notifications', { params: { limit } }),
  markAllRead: () => apiClient.post('/notifications/read'),
  markRead: (id: number) => apiClient.post(`/notifications/${id}/read`),
  clear: () => apiClient.delete('/notifications'),
}

export const wishlistApi = {
  getMine: () => apiClient.get('/wishlist/me'),
  // Addressed by IGDB id, same as the catalog endpoints - a wishlist button only ever has
  // the id the catalog search itself returned, and most of those games have no row here.
  add: (externalId: number) => apiClient.post(`/wishlist/${externalId}`),
  remove: (externalId: number) => apiClient.delete(`/wishlist/${externalId}`),
}

export const followsApi = {
  getState: (handle: string) => apiClient.get(`/follows/${handle}`),
  follow: (handle: string) => apiClient.post(`/follows/${handle}`),
  unfollow: (handle: string) => apiClient.delete(`/follows/${handle}`),
  getPendingRequests: () => apiClient.get('/follows/me/requests'),
  getFollowers: () => apiClient.get('/follows/me/followers'),
  getFollowing: () => apiClient.get('/follows/me/following'),
  accept: (followId: number) => apiClient.post(`/follows/me/requests/${followId}/accept`),
  reject: (followId: number) => apiClient.post(`/follows/me/requests/${followId}/reject`),
}

export const adminApi = {
  // No admin authority required to call this one - a non-admin needs to be able to ask
  // and get back an empty list, so the frontend can tell "not an admin" apart from a
  // network error when deciding whether to show the admin nav.
  getMe: () => apiClient.get('/admin/me'),
}

export default apiClient
