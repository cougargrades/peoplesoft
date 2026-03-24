
import { afterAll, assert, beforeAll, describe, expect, it } from 'vitest'

import { PeopleSoftClient } from '../src/index'
import type { PageModel } from '../src/index'
import { expectedSearchAction } from './fixtures';


describe('fields', () => {
  
  let client: PeopleSoftClient;
  let page: PageModel;

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

    page = await client.load(
      '/psc/saprd/EMPLOYEE/HRMS/c/COMMUNITY_ACCESS.CLASS_SEARCH.GBL',
    );
  })

  const expectingFieldLabels = [
    'Institution',
    'Term',
    'Subject',
    'Show Open Classes Only',
    'Instructor Last Name',
    'Course Number',
    'Session',
    'Course Career',
    Symbol('SSR_CLSRCH_WRK_CATALOG_NBR'),
    Symbol('SSR_CLSRCH_WRK_LAST_NAME'),
  ];

  function getField(labelOrId: string | symbol) {
    return (
      typeof labelOrId === 'string'
      ? page.$getFieldByLabel(labelOrId)
      : (
        typeof labelOrId.description === 'string'
        ? page.$getFieldById(labelOrId.description)
        : undefined
      )
    );
  }
  
  // Test every field separately
  it.each(expectingFieldLabels)(`should find '%s' field`, (labelOrId) => {
    const field = getField(labelOrId);
    assert.isObject(field);
  })

  it(`should be able to find the search action`, () => {
    const found = page.actions.includes(expectedSearchAction);

    if (!found) console.warn(`Expected search action not found '${expectedSearchAction}', found instead:`, page.actions);
    assert.isTrue(found);
  })

  afterAll(() => {
    const tabular = expectingFieldLabels.map(labelOrId => {
      const field = getField(labelOrId);
      return {
        label: labelOrId,
        id: field?.id,
        type: field?.type,
        options: field?.options?.map(opt => JSON.stringify([opt.value, opt.label])),
      }
    });

    console.table(tabular);
  })
});
