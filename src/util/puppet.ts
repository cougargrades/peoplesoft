
import puppeteer from 'puppeteer'
import { ConfigAuth, ConfigCourse, ConfigRoot } from './config';
import { snooze } from '@au5ton/snooze';
import { info, error, success } from './prettyPrint'
import AvailableSection from '../model/AvailableSection';

export async function scrape(auth: ConfigAuth, course: ConfigCourse): Promise<AvailableSection[]> {

    info('Opening browser')
    const browser = await puppeteer.launch({
      args: [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
      ]
    });

    info(`Started ${await browser.version()}`);
    const page = await browser.newPage()

    info('Navigating to https://saprd.my.uh.edu/')
    await page.goto('https://saprd.my.uh.edu/')

    info('Logging in')

    // Select "UH Central"
    await page.waitFor('label[for=myuh]')
    await page.click('label[for=myuh]')

    // Type username
    await page.waitFor('#userid')
    await page.focus('#userid')
    await page.keyboard.type(auth.PeopleSoftIDNumber)

    // Type password
    await page.waitFor('#pwd')
    await page.focus('#pwd')
    await page.keyboard.type(auth.PeopleSoftPassword)

    // Submit button
    await page.waitFor('input[type=Submit]')

    // Wait for login form to submit
    const [response] = await Promise.all([
        page.waitForNavigation(), // The promise resolves after navigation has finished
        page.click('input[type=Submit]'), // Clicking the link will indirectly cause a navigation
    ]);

    response.headers()['respondingwithsignonpage'] ? error('[⛔] Denied') : success('[✅] Logged in!')

    // if login was denied
    // if(response.headers()['respondingwithsignonpage']) {
    //   await browser.close();
    //   throw "Login failed";
    // }

    // "Student Center"
    info('Clicking "Student Center"')
    await page.waitFor(`div[id='win0divPTNUI_LAND_REC_GROUPLET$3']`)
    await page.click(`div[id='win0divPTNUI_LAND_REC_GROUPLET$3']`)

    // inner peoplesoft iframe
    await page.waitFor('#ptifrmtgtframe')
    const frame = await page.frames().find(frame => frame.name() === 'TargetContent')!;

    // "Search"
    info('Clicking "Search"')
    await frame.waitForSelector('tr #DERIVED_SSS_SCR_SSS_LINK_ANCHOR1')
    await frame.click('tr #DERIVED_SSS_SCR_SSS_LINK_ANCHOR1')

    info('Filling form')

    // Select the appropriate semester
    await frame.waitForSelector('tbody #CLASS_SRCH_WRK2_STRM\\$35\\$')
    await frame.select('tbody #CLASS_SRCH_WRK2_STRM\\$35\\$', course.SemesterCode)
    await snooze(2000)

    // Subject selector
    await frame.waitForSelector('tbody #SSR_CLSRCH_WRK_SUBJECT_SRCH\\$1')
    await frame.select('tbody #SSR_CLSRCH_WRK_SUBJECT_SRCH\\$1', course.Subject)

    // Uncheck "Open Only"
    await frame.waitForSelector('tbody #SSR_CLSRCH_WRK_SSR_OPEN_ONLY\\$4')
    await frame.click('tbody #SSR_CLSRCH_WRK_SSR_OPEN_ONLY\\$4')

    // Type in the catalog number
    await frame.waitForSelector('tbody #SSR_CLSRCH_WRK_CATALOG_NBR\\$2')
    await frame.focus('tbody #SSR_CLSRCH_WRK_CATALOG_NBR\\$2')
    await page.keyboard.type(course.CatalogNumber)

    info('Submitting form')
    // Click the submit button, which will fail if done too quickly???
    await frame.waitForSelector('td > #win0divCLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH #CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH')
    await snooze(2000)
    await frame.click('td > #win0divCLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH #CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH')

    info('Loading results')
    await frame.waitForSelector('#ACE_DERIVED_CLSRCH_GROUP6')

    info('Scraping DOM')
    //console.log(await page.screenshot({ encoding: 'base64' }))
    let data = await frame.evaluate(() => {
        // Sample, see screenshot:
        // https://gist.github.com/au5ton/262a22975afdbde7a88bff670f94eef7#gistcomment-3244673
        function getRowElements() {
            let template = (x: any) => `trSSR_CLSRCH_MTG1$${x}_row1`;
            let results = [];
            for (let i = 0; true; i++) {
                let e = document.getElementById(template(i));
                if (e === null) break;
                results.push(e);
            }
            return results;
        }

        /*
          SAMPLE:
          ["20846", "01-LEC\nRegular", "MoWe 4:00PM - 5:30PM", "SEC 104", "Kevin B Long", "", 
          "01/13/2020 - 05/06/2020", "University of Houston", "Face to Face", "", "Closed", "", "Select"]
        */
        function getRowData(row: HTMLElement) {
            let columns = Array.from(row.children);
            return columns.map((e, i) => i !== 10 ? e.textContent?.trim() : e?.querySelector('img')?.getAttribute('alt'))
        }

        return Promise.resolve(Array.from(getRowElements()).map(row => getRowData(row)));
    })
    
    info('Closing browser')
    await browser.close()
    
    return data.map(e => new AvailableSection(course.Subject, course.CatalogNumber, e.map(e => (e === null || e === undefined) ? "" : e)));
}