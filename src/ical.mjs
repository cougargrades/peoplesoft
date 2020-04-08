import { RRule, RRuleSet, rrulestr } from 'rrule'
import { v4 as uuid } from 'uuid'

export function toDT(d) {
    return `${toD(d)}T${d.getHours()}${d.getMinutes}${d.getSeconds()}Z`
}

export function toD(d) {
    return `${d.getFullYear}${d.getMonth()+1}${d.getDate()+1}`
}

export function generateRRULE({ meetingTimeWritten, meetingStartDate, meetingEndDate }) {

    // writtenTime -> "MoWe 4:00PM-5:30PM"

    return new RRule({
        freq: RRule.WEEKLY,
        byweekday: [RRule.MO, RRule.FR],
        dtstart: new Date(startDate).valueOf(),
        until: new Date(endDate).valueOf()
    })
}

export function generateICAL({ subject, catalogNumber, instructor, sectionIdentifier, meetingTimeWritten, meetingStartDate, meetingEndDate, location }) {
return `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//io.cougargrades.peoplesoft//CougarGrades.io//EN
CALSCALE:GREGORIAN
BEGIN:VTIMEZONE
TZID:America/Chicago
TZURL:http://tzurl.org/zoneinfo-outlook/America/Chicago
X-LIC-LOCATION:America/Chicago
BEGIN:DAYLIGHT
TZOFFSETFROM:-0600
TZOFFSETTO:-0500
TZNAME:CDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0500
TZOFFSETTO:-0600
TZNAME:CST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTAMP:${toDT(new Date())}
UID:${uuid()}
RRULE:${generateRRULE(arguments[0])}
DTSTART;TZID=America/Chicago:${toDT(meetingStartDate)}
DTEND;TZID=America/Chicago:${toDT(meetingEndDate)}
SUMMARY:${subject} ${catalogNumber} (${instructor})[${sectionIdentifier}]
LOCATION:${location}
END:VEVENT
END:VCALENDAR
`
}
