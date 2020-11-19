#!/usr/bin/env ts-node-script

import express from 'express';
import Queue from 'bull';
import { setQueues, UI } from 'bull-board';
import { snooze } from '@au5ton/snooze';

type Foo = { message: string }

const jobs = new Queue<Foo>('Jobs');
setQueues([jobs]);

jobs.process(async (job) => {
  let progress = 0;
  for(let i = 0; i < 100; i++) {
    await snooze(100);
    progress += 1;
    await job.progress(progress);
  }
  console.log(`job message: ${job.data.message}`);
  return;
});

jobs.add({ message: 'Hello, World!' }, { repeat: { cron: '* * * * *' }})

//import puppeteer from 'puppeteer';

const app = express();
app.use('/', UI);
app.listen(1234, () => {
  console.log(`Example app listening at http://localhost:1234`);
});

// (async () => {
//   let browser = await puppeteer.launch({
//     args: [
//       '--headless',
//       '--no-sandbox',
//       '--disable-gpu',
//       '--disable-dev-shm-usage',
//       '--disable-setuid-sandbox'
//     ]
//   });

//   const browserVersion = await browser.version();
//   console.log(`Started ${browserVersion}`);

//   let page = await browser.newPage();
//   await page.close();
//   await browser.close();
// })();