import * as ical from './ical';
//import { generateICAL } from './ical.mjs';

export default class AvailableSection {
    subject: string;
    catalogNumber: string;
    sectionIdentifier: string;
    sectionNumber: string;
    instructionType: string;
    sectionLimitation: string;
    meetingTimeWritten: string;
    meetingStartTime: string;
    meetingEndTime: string;
    meetingWeekdays: string[];
    location: string;
    instructor: string;
    meetingDates: string;
    semesterStartDate: string;
    semesterEndDate: string;
    campus: string;
    instructionMode: string;
    registrationStatus: string;
    calendarFile: string;
    /*
      SAMPLE:
      0  ["20846", 
      1  "01-LEC\nRegular", 
      2  "MoWe 4:00PM - 5:30PM", 
      3  "SEC 104", 
      4  "Kevin B Long", 
      5  "", 
      6  "01/13/2020 - 05/06/2020", 
      7  "University of Houston", 
      8  "Face to Face", 
      9  "", 
      10 "Closed", 
      11 "", 
      12 "Select"
      ]
    */
    constructor(subject: string, catalogNumber: string, row: string[]) {
        this.subject = subject;
        this.catalogNumber = catalogNumber;
        this.sectionIdentifier = row[0];
        this.sectionNumber = (function(){try {
            return row[1].split('-')[0]; // "01"
        }catch(err){}finally{return null!}})();
        this.instructionType = (function(){try {
            return row[1].split('-')[1].split('\n')[0]; // "LEC" vs "LAB"
        }catch(err){}finally{return null!}})();
        this.sectionLimitation = (function(){try {
            return row[1].split('-')[1].split('\n')[1]; // "Regular" vs "Honors" ???
        }catch(err){}finally{return null!}})();
        this.meetingTimeWritten = row[2];
        this.meetingStartTime = (function(){try {
            return row[2].split(' ')[1];
        }catch(err){}finally{return null!}})();
        this.meetingEndTime = (function(){try {
            return row[2].split(' ')[3];
        }catch(err){}finally{return null!}})();
        this.meetingWeekdays = (function(){try {
            // see: https://stackoverflow.com/a/25452019
            return row[2].split(' ')[0].replace(/([A-Z])/g, ' $1').trim().split(' ');
        }catch(err){}finally{return null!}})();
        this.location = row[3];
        this.instructor = row[4];
        this.meetingDates = row[6];
        this.semesterStartDate = (function(){try {
            return row[6].split('-')[0].trim(); // "01/13/2020"
        }catch(err){}finally{return null!}})();
        this.semesterEndDate = (function(){try {
            return row[6].split('-')[1].trim(); // "01/13/2020"
        }catch(err){}finally{return null!}})();
        this.campus = row[7];
        this.instructionMode = row[8];
        this.registrationStatus = row[10];

        // Intepretted
        // Reference: https://icalendar.org/
        this.calendarFile = ical.generateICAL(this);
    }
}