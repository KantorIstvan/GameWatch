/**
 * The signed-in account's stable id (Auth0's `user.sub`), mirrored here so code that
 * cannot itself call `useAuth0()` - a module-level cache, a plain singleton service - can
 * still ask "whose data is this" before touching `localStorage`.
 *
 * `AuthContext` is the one place that writes it, since it is already the single
 * always-mounted source of truth for auth state (same shape as `authToken` in
 * `services/api.ts`, which exists for the identical reason: giving non-component code a
 * synchronous read of state React otherwise only hands out through a hook).
 */
let currentUserId: string | null = null

export function getCurrentUserId(): string | null {
  return currentUserId
}

export function setCurrentUserId(userId: string | null): void {
  currentUserId = userId
}
