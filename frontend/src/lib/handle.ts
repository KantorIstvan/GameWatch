/**
 * Client-side mirror of the backend's handle rules (HandleValidator).
 *
 * Deliberately a mirror and not a second opinion: the server is what decides, and this
 * exists only so someone typing a handle is told what is wrong before they submit. If the
 * two ever disagree the server wins, and this file is the one to fix.
 *
 * Reserved names are not listed here. That list lives server-side and changes with the
 * routes, so duplicating it would guarantee drift - a reserved name simply comes back from
 * the availability check as unavailable, which is what it is.
 */

export const HANDLE_MIN_LENGTH = 3
export const HANDLE_MAX_LENGTH = 30

/** Lowercase letters, digits and inner underscores only. */
const ALLOWED = /^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/

/** Which rule was broken, so the caller can translate it rather than show English. */
export type HandleIssue = 'required' | 'tooShort' | 'tooLong' | 'charset'

/**
 * Matches the server's normalize step, so what gets validated and what gets sent are the
 * same string. Case is folded rather than rejected - typing a capital is a keyboard
 * accident, not a decision worth an error message.
 */
export function normalizeHandle(value: string): string {
  return value.trim().toLowerCase()
}

/** @returns the broken rule, or null when the handle is acceptable. */
export function validateHandle(value: string): HandleIssue | null {
  const candidate = normalizeHandle(value)

  if (!candidate) return 'required'
  if (candidate.length < HANDLE_MIN_LENGTH) return 'tooShort'
  if (candidate.length > HANDLE_MAX_LENGTH) return 'tooLong'
  if (!ALLOWED.test(candidate)) return 'charset'
  return null
}
