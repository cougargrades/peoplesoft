import { z } from 'zod'

export type MakePropertiesOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;



// ---------------------------------------------------------------------------
// Field types
// ---------------------------------------------------------------------------

/**
 * The subset of HTML input types + extra form element types we care about.
 * "unknown" is a safe fallback for any type we haven't modelled.
 */
export const FieldTypeSchema = z.enum([
  'checkbox',
  'date',
  'datetime-local',
  'email',
  'hidden',
  'image',
  'number',
  'password',
  'radio',
  'reset',
  'select',
  'submit',
  'text',
  'textarea',
  'time',
  'button',
  'unknown',
])

export type FieldType = z.infer<typeof FieldTypeSchema>

// ---------------------------------------------------------------------------
// Select / radio options
// ---------------------------------------------------------------------------

export const SelectOptionSchema = z.object({
  /** The value sent on form submission */
  value: z.string(),
  /** The human-readable label */
  label: z.string(),
  /** Whether this option is currently selected */
  selected: z.boolean(),
})

export type SelectOption = z.infer<typeof SelectOptionSchema>

// ---------------------------------------------------------------------------
// Form field
// ---------------------------------------------------------------------------

export const FormFieldSchema = z.object({
  /**
   * The HTML id attribute. May be empty for fields that only have a name.
   */
  id: z.string().default(''),
  /**
   * The HTML name attribute. Used as the POST body key.
   * This is always set — nameless fields are excluded from the model.
   */
  name: z.string(),
  /** Normalised field type */
  type: FieldTypeSchema.default('text'),
  /** Current value. For checkboxes: "on" | "" */
  value: z.string().default(''),
  /**
   * Text content of the associated <label> element (if found).
   * Empty string when no label could be resolved.
   */
  label: z.string().default(''),
  /**
   * Non-null for select, radio. null for all other types.
   * Lists every option with its value, label, and selection state.
   */
  options: z.array(SelectOptionSchema).nullable().default(null),
  /** Whether the field is disabled */
  disabled: z.boolean().default(false),
  /** Whether the field is readonly */
  readonly: z.boolean().default(false),
})

export type FormField = z.infer<typeof FormFieldSchema>

// ---------------------------------------------------------------------------
// PeopleSoft session state
// All fields are optional at parse time — defaults cover missing ones.
// ---------------------------------------------------------------------------

/**
 * The hidden fields that PeopleSoft uses to track server-side session state.
 * These are extracted from every page response and sent back on every POST.
 */
export const PSStateSchema = z.object({
  ICSID:          z.string().default(''),
  ICStateNum:     z.string().default('1'),
  ICType:         z.string().default('Panel'),
  ICElementNum:   z.string().default('0'),
  ICFind:         z.string().default('0'),
  ICAddCount:     z.string().default('0'),
  ICXPos:         z.string().default('0'),
  ICYPos:         z.string().default('0'),
  ICChanged:      z.string().default('0'),
  ICSave:         z.string().default('0'),
  ICResubmit:     z.string().default('0'),
  ICFocus:        z.string().default(''),
  ICAJAX:         z.string().default('1'),
  ICBcDomData:    z.string().default('undefined'),
  ICPanelHelpUrl: z.string().default(''),
})

export type PSState = z.infer<typeof PSStateSchema>

// ---------------------------------------------------------------------------
// Page model — the result of loading or submitting a page
// ---------------------------------------------------------------------------

/**
 * A fully-parsed snapshot of a PeopleSoft page.
 *
 * - `fields` contains every discoverable user-space form field, keyed by
 *   their HTML name= attribute. PeopleSoft infrastructure fields (ICSID,
 *   ICStateNum, etc.) are NOT included here — they live in `psState`.
 *
 * - `actions` lists the IDs/names of all elements on the page that can be
 *   used as the `action` when calling `client.submit()`.
 */
export const PageModelSchema = z.object({
  /** The URL this model was loaded from */
  url: z.string(),
  /** Resolved absolute URL of the form's action attribute */
  formAction: z.string(),
  /** PeopleSoft hidden state fields — managed automatically by the client */
  psState: PSStateSchema,
  /** User-space form fields, keyed by name= attribute */
  fields: z.record(z.string(), FormFieldSchema),
  /**
   * IDs / names of all interactive elements (buttons, submit inputs, JS
   * action links) found on the page. Pass one of these as `action` to
   * `client.submit()`.
   */
  actions: z.array(z.string()).default([]),
})

export type PageModel = z.infer<typeof PageModelSchema>

// ---------------------------------------------------------------------------
// Submit options
// ---------------------------------------------------------------------------

/**
 * Options passed to `client.submit()`.
 */
export const SubmitOptionsSchema = z.object({
  /**
   * The ICAction value — effectively "which button was clicked".
   * Must be one of the IDs from `PageModel.actions`, or any other
   * valid PeopleSoft button/link ID you know exists on the page.
   */
  action: z.string(),
  /**
   * Field values to set before submitting, keyed by field name=.
   * These are merged on top of the current values from the PageModel,
   * so you only need to include fields you want to change.
   */
  fields: z.record(z.string(), z.string()).default({}),
})

export type SubmitOptions = z.infer<typeof SubmitOptionsSchema>

// ---------------------------------------------------------------------------
// Client configuration
// ---------------------------------------------------------------------------

/**
 * This is the Safari/iOS 26 User-Agent.
 * This is very useful because it's a common device, and in iOS 26 Apple *froze* the User-Agent string forever in the name of privacy.
 * This will be a valid User-Agent string forever, and not blockable without blocking actual iOS devices.
 */
export const DEFAULT_USERAGENT = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1`;

/**
 * Options for constructing a `PeopleSoftClient`.
 */
export const ClientConfigSchema = z.object({
  /**
   * The base URL of the PeopleSoft instance.
   * e.g. "https://saprd.my.uh.edu"
   */
  baseUrl: z.url(),
  /**
   * Seed cookies injected before the first request.
   * Use this to supply a pre-authenticated PS_TOKEN from your browser.
   *
   * @example
   * { PS_TOKEN: 'eyJ...', PSsession: '...' }
   */
  cookies: z.record(z.string(), z.string()).optional().default({}),
  /**
   * Additional HTTP headers sent with every request.
   * Content-Type and Cookie are managed automatically.
   * A default User-Agent will be used (see: `DEFAULT_USERAGENT`)
   */
  headers: z.record(z.string(), z.string()).optional().default({
    'User-Agent': DEFAULT_USERAGENT,
  }),
})

export type ClientConfig = z.infer<typeof ClientConfigSchema>

