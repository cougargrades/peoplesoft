import fs from 'fs';
import { promisify } from 'util';
import { is } from 'typescript-is';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export async function readConfigFromDisk(): Promise<ConfigRoot> {
  console.log('readConfigFromDisk');
  const configLoc = '/config/config.json'

  if(fs.existsSync('/config')) {
    // if file exists
    if(fs.existsSync(configLoc)) {
      // read it
      let configRaw: any = await readFile(configLoc,  { encoding: 'utf-8' });
      // check its type

      let configData = null

      try {
        configData = JSON.parse(configRaw);
      }
      catch(err) { }

      // automatically check type guard 🎉
      if(is<ConfigRoot>(configData)) {
        // type is good???
        return configData;
      }
    }
  }
  else {
    await mkdir('/config');
  }

  // if a valid file wasn't found, create one and save it.
  let sampleConfig: ConfigRoot = {
    Authentication: {
      PeopleSoftIDNumber: SAMPLE_PSID, 
      PeopleSoftPassword: 'hunter2' 
    }, 
    Courses: [
      { Subject: 'COSC', CatalogNumber: '3360', SemesterCode: '2130', DesiredSectionNumbers: [] }
    ],
    Telegram: {
      BotToken: 'jladsoiasdmnaisdnasdh',
      ChatId: '-4467267424'
    }
  };
  await writeFile(configLoc, JSON.stringify(sampleConfig, null, 1), 'utf8');
  // we should be able to recurse and get the real thing
  return await readConfigFromDisk();
}

export interface ConfigRoot {
  Authentication: ConfigAuth,
  Courses: ConfigCourse[],
  Telegram: ConfigTelegram
}

export interface ConfigAuth {
  PeopleSoftIDNumber: string,
  PeopleSoftPassword: string,
}

export interface ConfigCourse {
  Subject: string,
  CatalogNumber: string,
  SemesterCode: string,
  DesiredSectionNumbers: string[]
}

export interface ConfigTelegram {
  BotToken: string,
  ChatId: string
}

export const SAMPLE_PSID = '123456';