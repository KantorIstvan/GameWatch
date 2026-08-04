import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { ProfileSettings } from '../types'

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
  getProfileSettings: () => apiClient.get('/users/me/profile'),
  updateProfileSettings: (settings: ProfileSettings) =>
    apiClient.put('/users/me/profile', settings),
  isHandleAvailable: (handle: string) =>
    apiClient.get('/users/me/handle-available', { params: { handle } }),
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

export const reviewsApi = {
  getReviews: (gameId: number, sort: string, language?: string) =>
    apiClient.get(`/games/${gameId}/reviews`, { params: { sort, language } }),
  submitReview: (
    gameId: number,
    review: { body: string; containsSpoilers: boolean; language: string }
  ) => apiClient.put(`/games/${gameId}/reviews`, review),
  deleteReview: (gameId: number) => apiClient.delete(`/games/${gameId}/reviews`),
  toggleHelpful: (reviewId: number) => apiClient.post(`/reviews/${reviewId}/helpful`),
}

export const profilesApi = {
  getProfile: (handle: string) => apiClient.get(`/profiles/${handle}`),
  search: (query: string) => apiClient.get('/profiles/search', { params: { query } }),
  compare: (handle: string) => apiClient.get(`/profiles/${handle}/compare`),
}

export const groupsApi = {
  getMyGroups: () => apiClient.get('/groups'),
  createGroup: (name: string, description: string | null) =>
    apiClient.post('/groups', { name, description }),
  getGroup: (slug: string) => apiClient.get('/groups/' + slug),
  join: (slug: string) => apiClient.post('/groups/' + slug + '/join'),
  leave: (slug: string) => apiClient.delete('/groups/' + slug + '/leave'),
  addChallenge: (slug: string, challenge: Record<string, string>) =>
    apiClient.post('/groups/' + slug + '/challenges', challenge),
}

export const feedApi = {
  getFeed: (limit?: number) => apiClient.get('/feed', { params: { limit } }),
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

export default apiClient
