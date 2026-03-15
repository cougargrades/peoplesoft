import { CookieJar } from './cookie-jar'
import { parsePage } from './parser'
import type { PageModel, ClientConfig, SubmitOptions, MakePropertiesOptional } from './types'
import { ClientConfigSchema, SubmitOptionsSchema } from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * PeopleSoft hidden fields that are constant on every request.
 * These never change based on page state — they are always these values.
 */
const PS_CONSTANT_FIELDS: Record<string, string> = {
  ICXPos:         '0',
  ICYPos:         '0',
  ICElementNum:   '0',
  ICFind:         '0',
  ICAddCount:     '0',
  ICResubmit:     '0',
  ICChanged:      '0',
  ICSave:         '0',
  ICFocus:        '',
  ICAJAX:         '1',
  ICBcDomData:    'undefined',
  ICPanelHelpUrl: '',
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class PeopleSoftError extends Error {
  readonly statusCode: number | undefined

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'PeopleSoftError'
    this.statusCode = statusCode
  }
}

export class AuthenticationError extends PeopleSoftError {
  constructor(url: string) {
    super(
      `PeopleSoft redirected to a login page. ` +
      `Provide a valid PS_TOKEN cookie or re-authenticate. (redirected to: ${url})`,
    )
    this.name = 'AuthenticationError'
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class PeopleSoftClient {
  private readonly jar: CookieJar
  private readonly config: ClientConfig
  private readonly fetchImpl: typeof globalThis.fetch

  /**
   * @param config      Client configuration (baseUrl, cookies, headers).
   * @param fetchImpl   Optional fetch implementation. Defaults to
   *                    `globalThis.fetch`. Inject a custom one for testing
   *                    or for runtimes that need special setup.
   */
  constructor(
    config: MakePropertiesOptional<ClientConfig, 'cookies' | 'headers'>,
    fetchImpl?: typeof globalThis.fetch,
  ) {
    this.config = ClientConfigSchema.parse(config)
    this.jar = new CookieJar()
    this.fetchImpl = fetchImpl ?? globalThis.fetch

    // Seed the cookie jar with any pre-authenticated cookies
    if (Object.keys(this.config.cookies).length > 0) {
      const { hostname } = new URL(this.config.baseUrl)
      this.jar.inject(this.config.cookies, hostname)
    }
  }


  
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Load a PeopleSoft page and return its model.
   *
   * The `path` argument can be either:
   *   - An absolute URL: `"https://saprd.my.uh.edu/psc/saprd/EMPLOYEE/..."`
   *   - A path relative to `baseUrl`: `"/psc/saprd/EMPLOYEE/HRMS/c/..."`
   *
   * @example
   * const page = await client.load(
   *   '/psc/saprd/EMPLOYEE/HRMS/c/COMMUNITY_ACCESS.CLASS_SEARCH.GBL'
   * )
   * console.log(page.fields)   // All discoverable form fields
   * console.log(page.actions)  // Available action IDs
   */
  async load(path: string): Promise<PageModel> {
    const url = this.resolveUrl(path)
    const response = await this.get(url)
    const html = await response.text()
    this.assertNotLoginPage(response.url, html)
    return parsePage(html, response.url)
  }

  /**
   * Submit a form action on the given page and return the resulting page model.
   *
   * The client automatically:
   *   - Sets `ICAction` to the specified action
   *   - Sends the current `ICSID` and `ICStateNum` from the page
   *   - Includes all current field values (with your overrides applied on top)
   *   - Attaches session cookies
   *
   * @param page     A `PageModel` from a previous `load()` or `submit()` call.
   * @param options  The action to trigger and any field values to override.
   *
   * @example
   * const results = await client.submit(page, {
   *   action: 'CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH',
   *   fields: {
   *     'CLASS_SRCH_WRK2_STRM$38$':    '2258',
   *     'CLASS_SRCH_WRK2_SUBJECT$38$': 'COSC',
   *   },
   * })
   */
  async submit(page: PageModel, options: SubmitOptions): Promise<PageModel> {
    const { action, fields: overrides } = SubmitOptionsSchema.parse(options)

    const body = this.buildPostBody(page, action, overrides)
    const response = await this.post(page.formAction, body)
    const html = await response.text()
    this.assertNotLoginPage(response.url, html)
    return parsePage(html, response.url)
  }

  /**
   * Return a snapshot of all cookies currently held in the jar.
   * Useful for persisting a session or debugging authentication issues.
   */
  cookieSnapshot(): Record<string, string> {
    return this.jar.snapshot()
  }

  // -------------------------------------------------------------------------
  // Form body construction
  // -------------------------------------------------------------------------

  /**
   * Build the URLSearchParams body for a PeopleSoft form POST.
   *
   * Layer order (later layers win on key collision):
   *   1. PS constant fields (never change)
   *   2. PS session state from the current page (ICSID, ICStateNum, ICType)
   *   3. ICAction (the button being "clicked")
   *   4. All current page field values
   *   5. Caller-supplied overrides
   */
  private buildPostBody(
    page: PageModel,
    action: string,
    overrides: Record<string, string>,
  ): URLSearchParams {
    const body = new URLSearchParams()

    // 1. Constants
    for (const [key, value] of Object.entries(PS_CONSTANT_FIELDS)) {
      body.set(key, value)
    }

    // 2. Session state
    body.set('ICSID',      page.psState.ICSID)
    body.set('ICStateNum', page.psState.ICStateNum)
    body.set('ICType',     page.psState.ICType)

    // 3. Action
    body.set('ICAction', action)

    // 4. Current field values — send every field the page knows about
    for (const [name, field] of Object.entries(page.fields)) {
      body.set(name, field.value)
    }

    // 5. Caller overrides
    for (const [name, value] of Object.entries(overrides)) {
      body.set(name, value)
    }

    return body
  }

  // -------------------------------------------------------------------------
  // HTTP primitives
  // -------------------------------------------------------------------------

  private async get(url: string): Promise<Response> {
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: this.buildHeaders(url),
      redirect: 'follow',
    })
    this.jar.processResponse(response, url)
    this.assertOk(response)
    return response
  }

  private async post(url: string, body: URLSearchParams): Promise<Response> {
    const headers = this.buildHeaders(url)
    headers.set('Content-Type', 'application/x-www-form-urlencoded')

    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers,
      body: body.toString(),
      redirect: 'follow',
    })
    this.jar.processResponse(response, url)
    this.assertOk(response)
    return response
  }

  // -------------------------------------------------------------------------
  // Header construction
  // -------------------------------------------------------------------------

  private buildHeaders(url: string): Headers {
    const headers = new Headers()

    // Apply caller-supplied default headers first
    for (const [key, value] of Object.entries(this.config.headers)) {
      headers.set(key, value)
    }

    // Managed headers (override anything the caller set for these)
    headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
    headers.set('Accept-Language', 'en-US,en;q=0.9');

    const cookieHeader = this.jar.cookieHeader(url)
    if (cookieHeader !== '') {
      headers.set('Cookie', cookieHeader)
    }

    return headers
  }

  // -------------------------------------------------------------------------
  // Guards
  // -------------------------------------------------------------------------

  private assertOk(response: Response): void {
    if (!response.ok) {
      throw new PeopleSoftError(
        `HTTP ${response.status} ${response.statusText} from ${response.url}`,
        response.status,
      )
    }
  }

  /**
   * PeopleSoft returns HTTP 200 even for session-expired pages — it just
   * renders the login form instead of the component. Detect this and throw
   * a meaningful error rather than silently returning an empty PageModel.
   *
   * We detect login pages by looking for the PeopleSoft sign-in form ID or
   * the presence of the userid/password field pair.
   */
  private assertNotLoginPage(url: string, html: string): void {
    // PeopleSoft login page markers (static strings, no parsing needed)
    const LOGIN_MARKERS = [
      'id="userid"',
      'name="userid"',
      'id="login"',
      'Oracle PeopleSoft Sign-in'
    ]

    // Only check if we've been redirected to a different path
    const { pathname } = new URL(url)
    const isLoginPath = pathname.includes('/psp/') && !pathname.includes('/psc/')

    if (isLoginPath) {
      throw new AuthenticationError(url)
    }

    for(let marker of LOGIN_MARKERS) {
      if (html.includes(marker)) {
        throw new AuthenticationError(url)
      }
    }
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  private resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    return new URL(path, this.config.baseUrl).toString()
  }
}
