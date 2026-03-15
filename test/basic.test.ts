
import { describe, expect, it } from 'vitest'

import { PeopleSoftClient } from '../src/index'
import type { PageModel } from '../src/index'

describe('basic', () => {
  it('able to fetch once, load cookies, and fetch again without error', async () => {

    const client = new PeopleSoftClient({
      baseUrl: `https://saprd.my.uh.edu`,
    });

    try {
      // Expecting to fail, because we'll redirect to the login page, but we'll have the cookie we need!
      const firstLoad = await client.load(`/psc/saprd/EMPLOYEE/HRMS/c/COMMUNITY_ACCESS.CLASS_SEARCH.GBL`);
    }
    catch (err) {
      //
    }

    // If second load fails, we're cooked.
    const cookies = client.cookieSnapshot();
    const secondLoad = await client.load(`/psc/saprd/EMPLOYEE/HRMS/c/COMMUNITY_ACCESS.CLASS_SEARCH.GBL`);
  })
});
