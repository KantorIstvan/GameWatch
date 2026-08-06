/**
 * Recognising which social platform a profile link points to, and making sure whatever a
 * user typed into that field is safe to store and render as a clickable anchor.
 *
 * Detection lives here as a single pure function rather than scattered through whichever
 * component happens to render a link - `EditProfileSheet` needs it for the live icon
 * preview while typing, `ProfileIdentity` needs the same answer when rendering someone
 * else's saved links, and both must always agree.
 */

export type SocialPlatform =
  | 'x'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'twitch'
  | 'steam'
  | 'discord'
  | 'github'
  | 'reddit'
  | 'bluesky'
  | 'website'

interface PlatformRule {
  platform: SocialPlatform
  /** Bare hosts this platform is known by - matched exactly or as a suffix of any subdomain. */
  hosts: string[]
}

// x.com and twitter.com are the same platform post-rebrand, so both map to 'x'.
const PLATFORM_RULES: PlatformRule[] = [
  { platform: 'x', hosts: ['x.com', 'twitter.com'] },
  { platform: 'instagram', hosts: ['instagram.com'] },
  { platform: 'tiktok', hosts: ['tiktok.com'] },
  { platform: 'youtube', hosts: ['youtube.com', 'youtu.be'] },
  { platform: 'twitch', hosts: ['twitch.tv'] },
  { platform: 'steam', hosts: ['steamcommunity.com', 'store.steampowered.com'] },
  { platform: 'discord', hosts: ['discord.com', 'discord.gg'] },
  { platform: 'github', hosts: ['github.com'] },
  { platform: 'reddit', hosts: ['reddit.com'] },
  { platform: 'bluesky', hosts: ['bsky.app'] },
]

/**
 * True when `hostname` is `host` itself or any subdomain of it - `www.x.com`,
 * `m.x.com` and a country-coded `de.x.com` all match `x.com` this way, without needing a
 * hand-maintained list of known subdomain prefixes. The leading dot in the suffix check is
 * what stops an unrelated domain like `notx.com` from being mistaken for a subdomain of
 * `x.com`.
 */
function hostMatches(hostname: string, host: string): boolean {
  return hostname === host || hostname.endsWith(`.${host}`)
}

/**
 * Which platform a profile link points to, purely from its URL host.
 *
 * Never throws: an unparseable or unrecognised URL simply falls back to the generic
 * 'website' platform, the same way it renders either way.
 */
export function detectSocialPlatform(url: string): SocialPlatform {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const match = PLATFORM_RULES.find((rule) => rule.hosts.some((host) => hostMatches(hostname, host)))
    if (match) {
      return match.platform
    }
  } catch {
    // Falls through to 'website' below - callers are expected to run links through
    // normalizeProfileLink first, so this path is a safety net, not the common case.
  }
  return 'website'
}

/** How many links a profile may carry - mirrors the backend's own cap. */
export const MAX_PROFILE_LINKS = 10

/**
 * Turns whatever someone typed into the profile-links field into a URL that is safe to
 * store and render as a clickable anchor, or null if it cannot be made into one.
 *
 * Bare input like "instagram.com/me" is accepted by assuming https - almost nobody types
 * the scheme by hand - but the result is always re-parsed through the URL constructor and
 * re-checked, so this can never turn a `javascript:` (or any other non-http) URL into
 * something that gets rendered as a link, however it was formatted going in.
 */
export function normalizeProfileLink(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
  const candidate = hasScheme ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }
  if (!parsed.hostname) {
    return null
  }

  return parsed.toString()
}
