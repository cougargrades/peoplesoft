
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
    const termField = page.$getField(f => f.id.startsWith('CLASS_SRCH_WRK2_STRM'))
    if (termField?.options) {
      console.log('\n--- Available terms ---')
      for (const option of termField.options) {
        if (option.value !== '') {
          console.log(`  ${option.value}  ${option.label}`)
        }
      }
    }

    // What institutions are available?
    const institutionField = page.$getField(f => f.id.startsWith('CLASS_SRCH_WRK2_INSTITUTION'))
    if (institutionField?.options) {
      console.log('\n--- Available institutions ---')
      for (const option of institutionField.options) {
        if (option.value !== '') {
          console.log(`  ${option.value}  ${option.label}`)
        }
      }
    }
  })
});
