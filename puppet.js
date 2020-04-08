#!/usr/bin/env node
require('dotenv').config()

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.log('unhandledRejection', error.message);
  process.exit(1)
});

const CONFIG = require('./config.json') || {};
const snooze = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch(CONFIG.puppeteer)
  const page = await browser.newPage()

  const navigationPromise = page.waitForNavigation()

  await page.goto('https://saprd.my.uh.edu/')

  // Select "UH Central"
  await page.waitFor('label[for=myuh]')
  await page.click('label[for=myuh]')

  // Type username
  await page.waitFor('#userid')
  await page.focus('#userid')
  await page.keyboard.type(process.env.PSID)

  // Type password
  await page.waitFor('#pwd')
  await page.focus('#pwd')
  await page.keyboard.type(process.env.PSPWD)

  // Submit button
  await page.waitFor('input[type=Submit]')

  // Wait for login form to submit
  const [response] = await Promise.all([
    page.waitForNavigation(), // The promise resolves after navigation has finished
    page.click('input[type=Submit]'), // Clicking the link will indirectly cause a navigation
  ]);

  // "Student Center"
  await page.waitFor(`div[id='win0divPTNUI_LAND_REC_GROUPLET$3']`)
  await page.click(`div[id='win0divPTNUI_LAND_REC_GROUPLET$3']`)

  // inner peoplesoft iframe
  await page.waitFor('#ptifrmtgtframe')
  const frame = await page.frames().find(frame => frame.name() === 'TargetContent');

  let i = 0;

  // "Search"
  await frame.waitForSelector('tr #DERIVED_SSS_SCR_SSS_LINK_ANCHOR1')
  await frame.click('tr #DERIVED_SSS_SCR_SSS_LINK_ANCHOR1')

  // Subject selector
  await frame.waitForSelector('tbody #SSR_CLSRCH_WRK_SUBJECT_SRCH\\$1')
  await frame.select('tbody #SSR_CLSRCH_WRK_SUBJECT_SRCH\\$1', 'COSC')

  // Uncheck "Open Only"
  await frame.waitForSelector('tbody #SSR_CLSRCH_WRK_SSR_OPEN_ONLY\\$4')
  await frame.click('tbody #SSR_CLSRCH_WRK_SSR_OPEN_ONLY\\$4')

  // Type in the catalog number
  await frame.waitForSelector('tbody #SSR_CLSRCH_WRK_CATALOG_NBR\\$2')
  await frame.focus('tbody #SSR_CLSRCH_WRK_CATALOG_NBR\\$2')
  await page.keyboard.type('2440')

  // Click the submit button, which will fail if done too quickly???
  await frame.waitForSelector('td > #win0divCLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH #CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH')
  await snooze(2000)
  await frame.click('td > #win0divCLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH #CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH')

  await frame.waitForSelector('#trSSR_CLSRCH_MTG1\\$1_row1')

  let data = await frame.evaluate(async () => {
    // Sample, see screenshot:
    // https://gist.github.com/au5ton/262a22975afdbde7a88bff670f94eef7#gistcomment-3244673
    function getRowElements() {
      let template = (x) => `trSSR_CLSRCH_MTG1$${x}_row1`;
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
    function getRowData(row) {
      let columns = Array.from(row.children);
      return columns.map((e, i) => i !== 10 ? e.textContent.trim() : e.querySelector('img').getAttribute('alt'))
    }

    return Array.from(getRowElements()).map(row => getRowData(row))
  })

  console.log(data)


  await browser.close()

  // "Schedule Planner"
  //await frame.waitFor('#PRJCS_DERIVED_PRJCS_SCHD_PLN_PB')
  //await frame.click('#PRJCS_DERIVED_PRJCS_SCHD_PLN_PB')

  // "Open Schedule Planner"
  //await frame.waitFor('#win0divPRJCS_DERIVED_PRJCS_LAUNCH_CS')
  //await frame.click('#win0divPRJCS_DERIVED_PRJCS_LAUNCH_CS')
})()