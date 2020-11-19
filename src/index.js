const puppeteer = require('puppeteer');

(async () => {
    let browser = await puppeteer.launch({
        args: [
            '--headless',
            '--no-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox'
        ]
    });

    const browserVersion = await browser.version();
    console.log(`Started ${browserVersion}`);

    let page = await browser.newPage();
    await page.close();
    await browser.close();
})();