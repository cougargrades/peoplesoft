// ---------------------------------------------------------------------------
// peoplesoft-client
// A runtime-agnostic TypeScript client for PeopleSoft IC web applications.
//
// Compatible with: Cloudflare Workers, Bun, Deno, Node 18+
// ---------------------------------------------------------------------------

// Main client and its error types
export * from './client'

// Zod schemas — re-exported so callers can validate/transform PS data
export * from './types'

// CookieJar is exported for advanced use cases (e.g. sharing a jar across
// multiple clients, or pre-populating from a persisted session snapshot)
export * from './cookie-jar'
