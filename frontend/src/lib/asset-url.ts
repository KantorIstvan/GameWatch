const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(
  /\/api\/?$/,
  ''
)

/**
 * The backend returns uploaded assets (avatars) as a path relative to its own origin,
 * e.g. `/api/avatars/{key}`, not the frontend's. That only resolves correctly when the
 * two share an origin - true behind the Vite dev proxy, but not for the deployed build,
 * where the frontend is served by its own nginx with no knowledge of `/api` and falls
 * through to the SPA instead of the image.
 */
export function resolveAssetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url}`
}
