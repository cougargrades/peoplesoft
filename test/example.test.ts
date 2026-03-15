
import { beforeAll, describe, expect, it } from 'vitest'

import { PeopleSoftClient } from '../src/index'
import type { PageModel } from '../src/index'



describe('example', () => {
  
  let client: PeopleSoftClient;

  beforeAll(async () => {

    // ---------------------------------------------------------------------------
    // 1. Construct the client
    // ---------------------------------------------------------------------------

    client = new PeopleSoftClient({
      baseUrl: 'https://saprd.my.uh.edu',
    });

    // Load expecting to fail because we need to populate the cookies initially
    try {
      await client.load('/psc/saprd/EMPLOYEE/HRMS/c/COMMUNITY_ACCESS.CLASS_SEARCH.GBL');
    }
    catch {}
  })

  it('demo', async () => {

    debugger

    // ---------------------------------------------------------------------------
    // 2. Discover the form
    // ---------------------------------------------------------------------------

    console.log('Loading CLASS_SEARCH page...')

    const page: PageModel = await client.load(
      '/psc/saprd/EMPLOYEE/HRMS/c/COMMUNITY_ACCESS.CLASS_SEARCH.GBL',
    )

    console.log('\n--- Available actions ---')
    for (const action of page.actions) {
      console.log(' ', action)
    }

    console.log('\n--- Discoverable fields ---')
    for (const [name, field] of Object.entries(page.fields)) {
      if (field.type === 'hidden') continue  // Skip hidden fields from display

      const optionsSummary = field.options
        ? ` [${field.options.map(o => o.value).join(', ')}]`
        : ''

      console.log(
        `  ${name.padEnd(45)} type=${field.type.padEnd(8)} value="${field.value}"${optionsSummary}`,
      )
    }

    // ---------------------------------------------------------------------------
    // 3. Introspect specific fields
    // ---------------------------------------------------------------------------

    // What terms are available?
    const termField = page.fields['CLASS_SRCH_WRK2_STRM$38$']
    if (termField?.options) {
      console.log('\n--- Available terms ---')
      for (const option of termField.options) {
        if (option.value !== '') {
          console.log(`  ${option.value}  ${option.label}`)
        }
      }
    }

    // What institutions are available?
    const institutionField = page.fields['CLASS_SRCH_WRK2_INSTITUTION$38$']
    if (institutionField?.options) {
      console.log('\n--- Available institutions ---')
      for (const option of institutionField.options) {
        if (option.value !== '') {
          console.log(`  ${option.value}  ${option.label}`)
        }
      }
    }

    // ---------------------------------------------------------------------------
    // 4. Submit a search
    // ---------------------------------------------------------------------------

    console.log('\nSearching for Fall 2025 COSC classes...')

    const resultsPage: PageModel = await client.submit(page, {
      // The ID of the "Search" button — discovered via page.actions above
      action: 'CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH',

      // Only send the fields you want to change.
      // All other fields are automatically carried forward from `page`.
      fields: {
        'CLASS_SRCH_WRK2_INSTITUTION$38$': 'UHCMP',   // UH Main Campus
        'CLASS_SRCH_WRK2_STRM$38$': '2258',    // Fall 2025
        'CLASS_SRCH_WRK2_SUBJECT$38$': 'COSC',    // Computer Science
        'CLASS_SRCH_WRK2_SSR_OPEN_ONLY$38$': 'N',       // All sections
      },
    })

    console.log('\n--- Result page fields (sample) ---')
    const resultFields = Object.entries(resultsPage.fields).slice(0, 10)
    for (const [name, field] of resultFields) {
      console.log(`  ${name}: "${field.value}"`)
    }

    // ---------------------------------------------------------------------------
    // 5. Paginate (if the result page has a "Next" action)
    // ---------------------------------------------------------------------------

    const nextAction = resultsPage.actions.find(a => a.includes('PB_NEXT'))

    if (nextAction) {
      console.log('\nFetching page 2...')
      const page2 = await client.submit(resultsPage, { action: nextAction, fields: {} })
      console.log(`Page 2 loaded. Fields found: ${Object.keys(page2.fields).length}`)
    }

    // ---------------------------------------------------------------------------
    // 6. Inspect cookie state (useful for debugging auth issues)
    // ---------------------------------------------------------------------------

    console.log('\n--- Current cookie state ---')
    const cookies = client.cookieSnapshot()
    for (const [name] of Object.entries(cookies)) {
      // Print names but not values to avoid leaking tokens in logs
      console.log(`  ${name}: [present]`)
    }


  })
});
