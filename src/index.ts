#!/usr/bin/env ts-node-script

import express from 'express';
import Queue from 'bull';
import { setQueues, UI } from 'bull-board';
import puppeteer from 'puppeteer';
import { snooze } from '@au5ton/snooze';

import { readConfigFromDisk } from './config';

type Foo = { message: string }

const jobs = new Queue<Foo>('Jobs');
setQueues([jobs]);

jobs.process(async (job) => {
  
  const config = await readConfigFromDisk();
  console.log(config);

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

  return;
});

jobs.add({ message: 'Hello, World!' }, { repeat: { cron: '* * * * *' }})

const app = express();
app.use('/', UI);
app.listen(1234, () => {
  console.log(`Example app listening at http://localhost:1234`);
});
