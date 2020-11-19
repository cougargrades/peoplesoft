#!/usr/bin/env ts-node-script

import express from 'express';
import Queue from 'bull';
import { setQueues, UI } from 'bull-board';
import puppeteer from 'puppeteer';
import { snooze } from '@au5ton/snooze';

import { readConfigFromDisk, SAMPLE_PSID } from './util/config';
import * as puppet from './util/puppet';
import * as prettyPrint from './util/prettyPrint';
import * as telegram from './util/telegram';

(async () => {
  let config = await readConfigFromDisk();
  if (config.Authentication.PeopleSoftIDNumber === SAMPLE_PSID) {
    prettyPrint.error('Please update the config.json file to include your own information!');
    return;
  }
})();

const jobs = new Queue('Jobs');
setQueues([jobs]);

jobs.process(async (job) => {
  console.log('Job spawned!')

  // Read config from disk (will also create if it doesn't exist)
  const config = await readConfigFromDisk();
  if (config.Authentication.PeopleSoftIDNumber === SAMPLE_PSID) {
    prettyPrint.error('Please update the config.json file to include your own information!');
    return;
  }

  // Business logic
  let i = 0;

  // for every course that we want to scrape
  for (let course of config.Courses) {
    // scrape its sections
    let sections = await puppet.scrape(config.Authentication, course);
    // update progress
    await job.progress(Math.ceil((i++ / config.Courses.length) * 100));
    // for every section in the results
    for (let section of sections) {
      // check if the section is "open" and if its a section we even care about
      let willSendNotification = false;
      // if no sections are provided, send a notification for ANY open section
      if (course.DesiredSectionNumbers.length === 0) {
        if (section.registrationStatus !== 'Close' && section.registrationStatus !== 'Wait List') {
          willSendNotification = true;
        }
      }
      else {
        if (section.registrationStatus !== 'Close' && section.registrationStatus !== 'Wait List' && course.DesiredSectionNumbers.includes(section.sectionIdentifier)) {
          willSendNotification = true;
        }
      }

      if (willSendNotification) {
        prettyPrint.cyan('📧 Telegram message sent!');
        await telegram.sendMessage(config.Telegram, `
<b><u>${course.Subject} ${course.CatalogNumber} is ${section.registrationStatus}!</u></b> 

Section #: <code>${section.sectionIdentifier}</code>
Registration Status: <code>${section.registrationStatus}</code>

Instructor: <code>${section.instructor}</code>
Meeting Time: <code>${section.meetingTimeWritten}</code>
Instruction Mode: <code>${section.instructionMode}</code>
        `);
      }

    }
  }

  return;
});

jobs.add({}, { repeat: { cron: '*/5 * * * *' } })
//jobs.add({})

const app = express();
app.use('/', UI);
app.listen(1234, () => {
  console.log(`Example app listening at http://localhost:1234`);
});
