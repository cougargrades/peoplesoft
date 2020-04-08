import { RRule, RRuleSet, rrulestr } from 'rrule'
import { v4 as uuid } from 'uuid'
import * as ical from './ical.mjs';
//import { generateICAL } from './ical.mjs';

export default class AvailableSection {
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
    constructor(subject, catalogNumber, row) {
        super()
        this.subject = subject;
        this.catalogNumber = catalogNumber;
        this.sectionIdentifier = row[0];
        this.sectionNumber = (function(){try {
            return row[1].split('-')[0]; // "01"
        }catch(err){}finally{return null}})();
        this.instructionType = (function(){try {
            return row[1].split('-')[1].split('\n')[0]; // "LEC" vs "LAB"
        }catch(err){}finally{return null}})();
        this.sectionLimitation = (function(){try {
            return row[1].split('-')[1].split('\n')[1]; // "Regular" vs "Honors" ???
        }catch(err){}finally{return null}})();
        this.meetingTimeWritten = row[2];
        this.location = row[3];
        this.instructor = row[4];
        this.meetingDates = row[6];
        this.meetingStartDate = (function(){try {
            return row[6].split('-')[0].trim(); // "01/13/2020"
        }catch(err){}finally{return null}})();
        this.meetingEndDate = (function(){try {
            return row[6].split('-')[1].trim(); // "01/13/2020"
        }catch(err){}finally{return null}})();
        this.campus = row[7];
        this.instructionMode = row[8];
        this.registrationStatus = row[10];

        // Intepretted
        // Reference: https://icalendar.org/
        this.meetingTimeICS = ical.generateICAL(this);

    }
}