#!/usr/bin/env ts-node-script

console.log('Hello, index.ts!');

import puppeteer from 'puppeteer'

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