require('dotenv').config()
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: false})
  const page = await browser.newPage()
  
  const navigationPromise = page.waitForNavigation()
  
  await page.goto('https://saprd.my.uh.edu/psp/saprd/?cmd=login')
  
  //await page.setViewport({ width: 1920, height: 969 })
  
  await page.waitForSelector('label[for=myuh]')
  await page.click('label[for=myuh]')

  await page.waitForSelector('body > #bodycontent > #loginbox #userid')
  await page.click('body > #bodycontent > #loginbox #userid')
  await page.keyboard.type(process.env.PSID)
  
  await page.waitForSelector('body > #bodycontent > #loginbox #pwd')
  await page.click('body > #bodycontent > #loginbox #pwd')
  await page.keyboard.type(process.env.PSPWD)
  
  // Submit button
  await page.waitFor('input[type=Submit]')

  // Wait for login form to submit
  const [response] = await Promise.all([
      page.waitForNavigation(), // The promise resolves after navigation has finished
      page.click('input[type=Submit]'), // Clicking the link will indirectly cause a navigation
  ]);

  // Determine login status
  console.log(response.headers()['respondingwithsignonpage'] ? '[⛔] Denied' : '[✅] Logged in!')

  await page.waitForSelector('#PTNUI_LAND_REC14\\$0_row_3 #PS_SCHEDULE_L_FL\\$3')
  await page.click('#PTNUI_LAND_REC14\\$0_row_3 #PS_SCHEDULE_L_FL\\$3')
  
  await navigationPromise

  let frames = await page.frames()
  const frame_84 = frames.find(f => f.url().startsWith('https://saprd.my.uh.edu/psp/saprd/UHM_SITE/SA/c/'))

  console.log('1')
  await frame_84.waitForSelector('tr #DERIVED_SSS_SCR_SSS_LINK_ANCHOR1')
  await frame_84.click('tr #DERIVED_SSS_SCR_SSS_LINK_ANCHOR1')
  
  console.log('2')
  await frame_84.waitForSelector('tbody #SSR_CLSRCH_WRK_SUBJECT_SRCH\\$1')
  await frame_84.click('tbody #SSR_CLSRCH_WRK_SUBJECT_SRCH\\$1')
  
  console.log('3')
  await frame_84.select('tbody #SSR_CLSRCH_WRK_SUBJECT_SRCH\\$1', 'COSC')
  
  console.log('4')
  await frame_84.waitForSelector('tbody #SSR_CLSRCH_WRK_SUBJECT_SRCH\\$1')
  await frame_84.click('tbody #SSR_CLSRCH_WRK_SUBJECT_SRCH\\$1')
  
  console.log('5')
  await frame_84.waitForSelector('tbody #SSR_CLSRCH_WRK_SSR_OPEN_ONLY\\$4')
  await frame_84.click('tbody #SSR_CLSRCH_WRK_SSR_OPEN_ONLY\\$4')
  
  console.log('6')
  await frame_84.waitForSelector('tbody #SSR_CLSRCH_WRK_CATALOG_NBR\\$2')
  await frame_84.click('tbody #SSR_CLSRCH_WRK_CATALOG_NBR\\$2')
  
  console.log('7')
  await frame_84.waitForSelector('td > #win0divCLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH #CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH')
  await frame_84.click('td > #win0divCLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH #CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH')
  
  await browser.close()
})()