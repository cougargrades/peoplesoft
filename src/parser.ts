import { load } from 'cheerio'
import type { PageModel, PSState, FormField, FieldType } from './types'
import {
  FieldTypeSchema,
  FormFieldSchema,
  PageModelSchema,
  PSStateSchema,
} from './types'

// ---------------------------------------------------------------------------
// PeopleSoft hidden field names
// ---------------------------------------------------------------------------

/**
 * The set of HTML name= values that belong to PeopleSoft's IC session state.
 * These are extracted into `psState` and excluded from `fields`.
 */
const PS_STATE_FIELD_NAMES = new Set<string>([
  'ICSID',
  'ICStateNum',
  'ICType',
  'ICElementNum',
  'ICFind',
  'ICAddCount',
  'ICXPos',
  'ICYPos',
  'ICChanged',
  'ICSave',
  'ICResubmit',
  'ICFocus',
  'ICAJAX',
  'ICBcDomData',
  'ICPanelHelpUrl',
  'ICAction',       // Managed by client.submit() — never a user field
  'ICAppClsData',   // Internal PS app class data
  'ICPanelName',    // Internal panel tracking
  'ICFromEntryForm',
  'ICModalWidget',
  'ICZoomGrid',
  'ICZoomGridRt',
  'ICModalLongClosed',
  'ICNavFormDta',
])

// ---------------------------------------------------------------------------
// Tag → FieldType mapping
// ---------------------------------------------------------------------------

/**
 * Map an HTML tag name + type attribute to our normalised FieldType.
 * Only called for elements that don't have an explicit type= that we already
 * pass through FieldTypeSchema.
 */
function resolveFieldType(tagName: string, typeAttr: string | undefined): FieldType {
  if (tagName === 'select') return 'select'
  if (tagName === 'textarea') return 'textarea'

  const normalised = (typeAttr ?? 'text').toLowerCase().trim()
  const parsed = FieldTypeSchema.safeParse(normalised)
  return parsed.success ? parsed.data : 'unknown'
}

// ---------------------------------------------------------------------------
// Label map construction
// ---------------------------------------------------------------------------

/**
 * Build a map from element id → label text by scanning all <label for="...">
 * elements in the document.
 *
 * PeopleSoft also wraps some fields in a table cell adjacent to the label
 * text, but the for= attribute is the most reliable association.
 */
function buildLabelMap($: ReturnType<typeof load>): Map<string, string> {
  const map = new Map<string, string>()

  $('label[for]').each((_, el) => {
    const forAttr = $(el).attr('for') ?? ''
    const text = $(el).text().trim()
    if (forAttr !== '' && text !== '') {
      map.set(forAttr, text)
    }
  })

  return map
}

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

/**
 * Extract a single <input> element as a FormField.
 * Returns null if the input should be skipped (no name, PS state field, etc.)
 */
function extractInput(
  $el: ReturnType<ReturnType<typeof load>>,
  labelMap: Map<string, string>,
): FormField | null {
  const name = $el.attr('name') ?? ''
  if (name === '' || PS_STATE_FIELD_NAMES.has(name)) return null

  const id = $el.attr('id') ?? ''
  const type = resolveFieldType('input', $el.attr('type'))

  // For checkboxes, the value is only meaningful when checked.
  // PS uses Y/N pattern, but we faithfully report the HTML value.
  const value = type === 'checkbox'
    ? ($el.attr('checked') !== undefined ? ($el.attr('value') ?? 'on') : '')
    : ($el.attr('value') ?? '')

  return FormFieldSchema.parse({
    id,
    name,
    type,
    value,
    label: labelMap.get(id) ?? labelMap.get(name) ?? '',
    options: null,
    disabled: $el.attr('disabled') !== undefined,
    readonly: $el.attr('readonly') !== undefined,
  })
}

/**
 * Extract a <select> element as a FormField.
 * Returns null if unnamed or a PS state field.
 */
function extractSelect(
  $el: ReturnType<ReturnType<typeof load>>,
  labelMap: Map<string, string>,
  $: ReturnType<typeof load>,
): FormField | null {
  const name = $el.attr('name') ?? ''
  if (name === '' || PS_STATE_FIELD_NAMES.has(name)) return null

  const id = $el.attr('id') ?? ''

  const options = $el.find('option').map((_, opt) => {
    const $opt = $(opt)
    return {
      value: $opt.attr('value') ?? '',
      label: $opt.text().trim(),
      selected: $opt.attr('selected') !== undefined,
    }
  }).get()

  // Current value: the selected option, or the first option, or empty
  const selectedOption = options.find(o => o.selected)
  const firstOption = options[0]
  const value = selectedOption?.value ?? firstOption?.value ?? ''

  return FormFieldSchema.parse({
    id,
    name,
    type: 'select' as const,
    value,
    label: labelMap.get(id) ?? labelMap.get(name) ?? '',
    options,
    disabled: $el.attr('disabled') !== undefined,
    readonly: $el.attr('readonly') !== undefined,
  })
}

/**
 * Extract a <textarea> element as a FormField.
 * Returns null if unnamed or a PS state field.
 */
function extractTextarea(
  $el: ReturnType<ReturnType<typeof load>>,
  labelMap: Map<string, string>,
): FormField | null {
  const name = $el.attr('name') ?? ''
  if (name === '' || PS_STATE_FIELD_NAMES.has(name)) return null

  const id = $el.attr('id') ?? ''

  return FormFieldSchema.parse({
    id,
    name,
    type: 'textarea' as const,
    value: $el.text().trim(),
    label: labelMap.get(id) ?? labelMap.get(name) ?? '',
    options: null,
    disabled: $el.attr('disabled') !== undefined,
    readonly: $el.attr('readonly') !== undefined,
  })
}

// ---------------------------------------------------------------------------
// PS state extraction
// ---------------------------------------------------------------------------

/**
 * Extract the PeopleSoft session state hidden fields from the form.
 * Missing fields fall back to the defaults defined in PSStateSchema.
 */
function extractPSState(
  $form: ReturnType<ReturnType<typeof load>>,
): PSState {
  const raw: Record<string, string> = {}

  $form.find('input[type="hidden"]').each((_, el) => {
    const $el = $form.find(el)
    // cheerio's .each gives us the element; we re-query to get a wrapped node
    const name = el.attribs?.['name'] ?? ''
    const value = el.attribs?.['value'] ?? ''
    if (PS_STATE_FIELD_NAMES.has(name)) {
      raw[name] = value
    }
  })

  return PSStateSchema.parse(raw)
}

// ---------------------------------------------------------------------------
// Action discovery
// ---------------------------------------------------------------------------

/**
 * Collect the IDs/names of all elements that can serve as an ICAction value.
 *
 * PeopleSoft renders clickable actions as:
 *   - <input type="submit" id="BTN_ID"> or <input type="button" id="BTN_ID">
 *   - <button id="BTN_ID">
 *   - <a id="BTN_ID" href="javascript:void(0)">
 *
 * We return the id= attribute (preferred) falling back to name= since that
 * is what gets set as the ICAction value in PeopleSoft's JS runtime.
 */
function discoverActions(
  $form: ReturnType<ReturnType<typeof load>>,
  $: ReturnType<typeof load>,
): string[] {
  const seen = new Set<string>()
  const actions: string[] = []

  const addIfNew = (candidate: string) => {
    if (candidate !== '' && !seen.has(candidate)) {
      seen.add(candidate)
      actions.push(candidate)
    }
  }

  // Submit / button inputs
  $form.find('input[type="submit"], input[type="button"]').each((_, el) => {
    const id = el.attribs?.['id'] ?? ''
    const name = el.attribs?.['name'] ?? ''
    addIfNew(id !== '' ? id : name)
  })

  // <button> elements
  $form.find('button').each((_, el) => {
    const id = el.attribs?.['id'] ?? ''
    const name = el.attribs?.['name'] ?? ''
    addIfNew(id !== '' ? id : name)
  })

  // <a> elements — PeopleSoft renders most actions as anchor tags with JS
  // onclick handlers. We collect the id= of every anchor inside the form.
  $form.find('a[id]').each((_, el) => {
    const id = el.attribs?.['id'] ?? ''
    addIfNew(id)
  })

  return actions
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parse a PeopleSoft HTML page and return a fully-typed PageModel.
 *
 * @param html     The full HTML string of the response body.
 * @param url      The URL the HTML was loaded from (used to resolve relative
 *                 form action URLs and cookie domain defaults).
 */
export function parsePage(html: string, url: string): PageModel {
  const $ = load(html)

  // PeopleSoft always uses a single form with id="win0".
  // Fall back to the first <form> on the page for non-standard configurations.
  let $form = $('form#win0')
  if ($form.length === 0) {
    $form = $('form').first()
  }

  // Resolve the form's action URL to an absolute URL.
  const rawAction = $form.attr('action') ?? url
  const formAction = rawAction.startsWith('http')
    ? rawAction
    : new URL(rawAction, url).toString()

  // Build label associations once, shared across all field extractors.
  const labelMap = buildLabelMap($)

  // Extract PS hidden state — must happen before field extraction so that
  // PS state fields are properly excluded from the user-facing field map.
  const psState = extractPSStateFromDoc($form, $)

  // Extract user-space fields
  const fields: Record<string, FormField> = {}

  $form.find('input').each((_, el) => {
    const $el = $form.find(`[name="${el.attribs?.['name'] ?? ''}"]`).first()
    const field = extractInput($el, labelMap)
    if (field !== null) {
      fields[field.name] = field
    }
  })

  $form.find('select').each((_, el) => {
    const name = el.attribs?.['name'] ?? ''
    if (name === '') return
    const $el = $form.find(`select[name="${name}"]`).first()
    const field = extractSelect($el, labelMap, $)
    if (field !== null) {
      fields[field.name] = field
    }
  })

  $form.find('textarea').each((_, el) => {
    const name = el.attribs?.['name'] ?? ''
    if (name === '') return
    const $el = $form.find(`textarea[name="${name}"]`).first()
    const field = extractTextarea($el, labelMap)
    if (field !== null) {
      fields[field.name] = field
    }
  })

  const actions = discoverActions($form, $)

  return PageModelSchema.parse({
    url,
    formAction,
    psState,
    fields,
    actions,
  })
}

// ---------------------------------------------------------------------------
// Internal: PS state from document (uses raw element attribute access to
// avoid re-querying through the full Cheerio chain)
// ---------------------------------------------------------------------------

function extractPSStateFromDoc(
  $form: ReturnType<ReturnType<typeof load>>,
  $: ReturnType<typeof load>,
): PSState {
  const raw: Record<string, string> = {}

  $form.find('input[type="hidden"]').each((_, el) => {
    const name = el.attribs?.['name'] ?? ''
    const value = el.attribs?.['value'] ?? ''
    if (PS_STATE_FIELD_NAMES.has(name)) {
      raw[name] = value
    }
  })

  return PSStateSchema.parse(raw)
}
