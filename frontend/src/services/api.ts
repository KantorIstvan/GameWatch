import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

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
    console.log('[Interceptor] Request to:', config.url)
    console.log('[Interceptor] authToken value:', authToken ? `${authToken.substring(0, 20)}...` : 'null')
    console.log('[Interceptor] config.headers before:', config.headers)
    
    if (authToken) {
      // Set authorization header directly on the config.headers object
      config.headers['Authorization'] = `Bearer ${authToken}`
      console.log('[Interceptor] Set Authorization header')
      console.log('[Interceptor] config.headers after:', config.headers)
      console.log('[Interceptor] Authorization header value:', config.headers['Authorization'])
    } else {
      console.warn('[Interceptor] No auth token available for request:', config.url)
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
    if (error.response?.status === 401) {
      console.error('[401 Error] URL:', error.config.url)
      console.error('[401 Error] Token was present:', !!authToken)
      console.error('[401 Error] Token value:', authToken ? `${authToken.substring(0, 30)}...` : 'null')
      console.error('[401 Error] Request headers:', error.config?.headers)
      console.error('[401 Error] Authorization header:', error.config?.headers?.Authorization)
      console.error('[401 Error] Authorization (bracket):', error.config?.headers?.['Authorization'])
    }
    return Promise.reject(error)
  }
)

export const setAuthToken = (token: string | null): void => {
  console.log('setAuthToken called with token:', token ? `${token.substring(0, 20)}...` : 'null')
  authToken = token
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common['Authorization']
  }
}

export const getAuthToken = (): string | null => {
  console.log('getAuthToken called, token present:', !!authToken)
  return authToken
}

export const gamesApi = {
  getAll: () => apiClient.get('/games'),
  getById: (id: number) => apiClient.get(`/games/${id}`),
  create: (data: any) => apiClient.post('/games', data),
  delete: (id: number) => apiClient.delete(`/games/${id}`),
  search: (query: string) => apiClient.get('/games/search', { params: { query } }),
  getDetails: (externalId: string) => apiClient.get(`/games/details/${externalId}`),
  getStatistics: (id: number) => apiClient.get(`/games/${id}/statistics`),
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
  getUserStatistics: (interval: 'week' | 'month' | 'year' | 'all' = 'all') => 
    apiClient.get('/statistics', { params: { interval } }),
  getGameRecommendations: (limit: number = 5) =>
    apiClient.get('/statistics/recommendations', { params: { limit } }),
}

export const userApi = {
  getCurrentUser: () => apiClient.get('/users/me'),
  updateAge: (age: number) => apiClient.put('/users/me/age', { age }),
  updateTimezone: (timezone: string) => apiClient.put('/users/me/timezone', { timezone }),
  deleteAccount: () => apiClient.delete('/users/me'),
}

export default apiClient
