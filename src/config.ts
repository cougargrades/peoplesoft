import fs from 'fs';
import { promisify } from 'util';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export async function readConfigFromDisk(): Promise<ConfigRoot> {
  const configLoc = '/config/config.json'

  if(fs.existsSync('/config')) {
    // if file exists
    if(fs.existsSync(configLoc)) {
      // read it
      let configData: any = await readFile(configLoc,  { encoding: 'utf-8' });
      // check its type
      if(isConfigRoot(configData)) {
        // type is good
        return configData;
      }
    }
  }
  else {
    await mkdir('/config');
  }

  // if a valid file wasn't found, create one and save it.
  let sampleConfig = new ConfigRoot(SAMPLE_PSID, 'hunter2', [{ Subject: 'COSC', CatalogNumber: '3360', SemesterCode: '2130' }]);
  await writeFile(configLoc, JSON.stringify(sampleConfig, null, 1), 'utf8');
  // we should be able to recurse and get the real thing
  return await readConfigFromDisk();
}

function isConfigRoot(obj: any): obj is ConfigRoot {
  try {
    let data = typeof obj === 'string' ? JSON.parse(obj) : obj;
    return data.PeopleSoftIDNumber !== undefined 
      && data.PeopleSoftPassword !== undefined 
      && Array.isArray(data.Courses) 
      && (data.Courses as any[]).every(e => isConfigCourse(e));
  }
  catch(err) {
    return false;
  }
}

function isConfigCourse(obj: any): obj is ConfigCourse {
  try {
    return obj.Subject !== undefined 
      && obj.CatalogNumber !== undefined 
      && obj.SemesterCode !== undefined;
  }
  catch(err) {
    return false;
  }
}

export class ConfigRoot {
  constructor(
    public PeopleSoftIDNumber: string,
    public PeopleSoftPassword: string,
    public Courses: ConfigCourse[]
  ) {}
}

export class ConfigCourse {
  constructor(
    public Subject: string,
    public CatalogNumber: string,
    public SemesterCode: string
  ) {}
}

export const SAMPLE_PSID = '123456';