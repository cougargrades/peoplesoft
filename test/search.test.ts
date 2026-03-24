
import { assert, beforeAll, describe, expect, it } from 'vitest'

import { PeopleSoftClient } from '../src/index'
import type { PageModel } from '../src/index'
import { expectedSearchAction } from './fixtures';



describe('search', () => {
  
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

    page = await client.load('/psc/saprd/EMPLOYEE/HRMS/c/COMMUNITY_ACCESS.CLASS_SEARCH.GBL');
  })

  it('should be able to search COSC courses in an available semester', async () => {

    // Grab the fields
    const termField = page.$getFieldByLabel('Term');
    const sessionField = page.$getFieldByLabel('Session');
    const subjectField = page.$getFieldByLabel('Subject');
    const careerField = page.$getFieldByLabel('Course Career');
    const openClassesField = page.$getFieldByLabel('Show Open Classes Only');

    // Test the fields
    assert.isObject(termField);
    assert.isArray(termField?.options);
    assert.isAtLeast(termField!.options!.length, 1);

    assert.isObject(sessionField);
    assert.isArray(sessionField?.options);
    assert.isAtLeast(sessionField!.options!.length, 1);
    
    assert.isObject(subjectField);
    assert.isArray(subjectField?.options);
    //assert.isAtLeast(subjectField!.options!.length, 1);

    assert.isObject(careerField);
    assert.isArray(careerField?.options);
    //assert.isAtLeast(careerField!.options!.length, 1);

    assert.isObject(openClassesField);
    
    // Verify that the intended action is found
    expect(page.actions).contain(expectedSearchAction);

    // Create values for each field that we will use in our search
    const termValue = termField?.options?.find(opt => opt.value !== '')?.value;
    assert.ok(termValue);
    const sessionValue = sessionField?.options?.find(opt => opt.label.includes('Regular'))?.value
    assert.ok(sessionValue);
    const subjectValue = 'COSC';
    const careerValue = 'UGRD';
    const openClassesValue = 'N';

    const resultsPage: PageModel = await client.submit(page, {
      // The ID of the "Search" button — discovered via page.actions above
      action: expectedSearchAction,

      // Only send the fields you want to change.
      // All other fields are automatically carried forward from `page`.
      fields: {
        // Filter to only a term that UH still offers results for
        [termField!.id]: termValue,
        // Choose the "Regular" session
        [sessionField!.id]: sessionValue,
        // Filter to "COSC" (Computer Science)
        [subjectField!.id]: subjectValue,
        // Filter to "UGRD" (Undergraduate)
        [careerField!.id]: careerValue,
        // Show all classes, not just those that are open
        [openClassesField!.id]: openClassesValue,
      },
    });

    
    assert.ok(resultsPage);
    assert.isAtLeast(Object.keys(resultsPage.actions).length, 1);
  })
});
