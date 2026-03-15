/**
 * A minimal cookie jar built entirely on web-standard APIs.
 *
 * Deliberately avoids:
 * - Node's `http` module
 * - `tough-cookie` or any third-party cookie library
 * - File system access
 *
 * Works on Cloudflare Workers, Bun, Deno, and Node 18+.
 */

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface StoredCookie {
  name: string
  value: string
  domain: string
  path: string
  expires: number | null  // Unix ms timestamp, or null = session cookie
  httpOnly: boolean
  secure: boolean
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a single Set-Cookie header value into a StoredCookie.
 * Returns null if the header is malformed.
 *
 * Format: name=value; Path=/; Domain=.example.com; Expires=...; HttpOnly; Secure
 */
function parseSetCookieHeader(header: string, requestUrl: string): StoredCookie | null {
  const parts = header.split(';')
  const nameValuePart = parts[0]

  if (nameValuePart === undefined || nameValuePart.trim() === '') return null

  const separatorIndex = nameValuePart.indexOf('=')
  if (separatorIndex === -1) return null

  const name = nameValuePart.slice(0, separatorIndex).trim()
  const value = nameValuePart.slice(separatorIndex + 1).trim()

  if (name === '') return null

  // Defaults derived from the request URL
  const parsedRequestUrl = new URL(requestUrl)
  let domain = parsedRequestUrl.hostname
  let path = '/'
  let expires: number | null = null
  let httpOnly = false
  let secure = false

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    if (part === undefined) continue

    const trimmedPart = part.trim()
    const lowerPart = trimmedPart.toLowerCase()

    if (lowerPart === 'httponly') {
      httpOnly = true
      continue
    }

    if (lowerPart === 'secure') {
      secure = true
      continue
    }

    const attrSeparator = trimmedPart.indexOf('=')
    if (attrSeparator === -1) continue

    const attrName = trimmedPart.slice(0, attrSeparator).trim().toLowerCase()
    const attrValue = trimmedPart.slice(attrSeparator + 1).trim()

    if (attrName === 'domain') {
      // Strip leading dot; the jar handles subdomain matching itself
      domain = attrValue.startsWith('.') ? attrValue.slice(1) : attrValue
    } else if (attrName === 'path') {
      path = attrValue === '' ? '/' : attrValue
    } else if (attrName === 'expires') {
      const parsed = Date.parse(attrValue)
      if (!isNaN(parsed)) expires = parsed
    } else if (attrName === 'max-age') {
      const seconds = Number(attrValue)
      if (Number.isFinite(seconds)) {
        expires = Date.now() + seconds * 1000
      }
    }
    // SameSite is intentionally ignored — irrelevant for server-side requests
  }

  return { name, value, domain, path, expires, httpOnly, secure }
}

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the request hostname is covered by the cookie's domain.
 * Handles both exact matches and subdomain matches.
 */
function domainMatches(cookieDomain: string, requestHostname: string): boolean {
  if (cookieDomain === requestHostname) return true
  return requestHostname.endsWith('.' + cookieDomain)
}

/**
 * Returns true if the request path falls under the cookie's path scope.
 */
function pathMatches(cookiePath: string, requestPath: string): boolean {
  if (cookiePath === '/') return true
  if (requestPath === cookiePath) return true
  // Cookie path must be a prefix of request path, ending at a separator
  return requestPath.startsWith(cookiePath + '/')
}

// ---------------------------------------------------------------------------
// Cookie key
// ---------------------------------------------------------------------------

/**
 * Stable identity key for a cookie: domain + path + name.
 * Setting the same triplet overwrites the previous entry.
 */
function cookieKey(domain: string, path: string, name: string): string {
  return `${domain}\0${path}\0${name}`
}

// ---------------------------------------------------------------------------
// CookieJar
// ---------------------------------------------------------------------------

export class CookieJar {
  private readonly store = new Map<string, StoredCookie>()

  /**
   * Inject a set of name→value pairs as session cookies for the given domain.
   * Useful for seeding an authenticated session (e.g. PS_TOKEN).
   */
  inject(cookies: Record<string, string>, domain: string): void {
    for (const [name, value] of Object.entries(cookies)) {
      const key = cookieKey(domain, '/', name)
      this.store.set(key, {
        name,
        value,
        domain,
        path: '/',
        expires: null,
        httpOnly: false,
        secure: false,
      })
    }
  }

  /**
   * Process the Set-Cookie headers from a response and update the store.
   * Expired cookies (Max-Age=0 or past Expires) are deleted.
   */
  processResponse(response: Response, requestUrl: string): void {
    const headers = getSetCookieHeaders(response.headers)

    for (const header of headers) {
      const cookie = parseSetCookieHeader(header, requestUrl)
      if (cookie === null) continue

      const key = cookieKey(cookie.domain, cookie.path, cookie.name)

      if (cookie.expires !== null && cookie.expires <= Date.now()) {
        // Explicit deletion (Max-Age=0 or Expires in the past)
        this.store.delete(key)
      } else {
        this.store.set(key, cookie)
      }
    }
  }

  /**
   * Build the Cookie header string for a request to the given URL.
   * Only cookies that match the request's domain, path, and expiry are included.
   */
  cookieHeader(url: string): string {
    const { hostname, pathname } = new URL(url)
    const now = Date.now()
    const pairs: string[] = []

    for (const cookie of this.store.values()) {
      if (!domainMatches(cookie.domain, hostname)) continue
      if (!pathMatches(cookie.path, pathname)) continue
      if (cookie.expires !== null && cookie.expires <= now) continue
      pairs.push(`${cookie.name}=${cookie.value}`)
    }

    return pairs.join('; ')
  }

  /**
   * Return a plain-object snapshot of all stored cookies (name → value).
   * Useful for debugging or persisting a session.
   */
  snapshot(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const cookie of this.store.values()) {
      result[cookie.name] = cookie.value
    }
    return result
  }
}

// ---------------------------------------------------------------------------
// Runtime-compat Set-Cookie extraction
// ---------------------------------------------------------------------------

/**
 * Extract all Set-Cookie header values from a Headers object.
 *
 * `Headers.prototype.getSetCookie()` is the correct web-standard API and is
 * available in all target runtimes (Cloudflare Workers, Bun, Deno, Node 18+).
 * We fall back to iterating header entries for any older environment.
 */
function getSetCookieHeaders(headers: Headers): string[] {
  // Primary path: web standard (Node 18.14+, Deno 1.30+, Bun, CF Workers)
  if (typeof (headers as unknown as Record<string, unknown>)['getSetCookie'] === 'function') {
    return (headers as unknown as { getSetCookie(): string[] }).getSetCookie()
  }

  // Fallback: iterate all header entries and collect set-cookie lines.
  // NOTE: Some runtimes incorrectly join multiple set-cookie values with a
  // comma. This fallback handles that correctly only for single-cookie
  // responses. Multi-cookie responses on ancient runtimes may partially fail.
  const results: string[] = []
  headers.forEach((value, name) => {
    if (name.toLowerCase() === 'set-cookie') {
      results.push(value)
    }
  })
  return results
}
