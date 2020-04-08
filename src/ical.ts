import { RRule, RRuleSet, rrulestr } from 'rrule'
import { v4 as uuid } from 'uuid'
import AvailableSection from './AvailableSection'

import { timeParse } from 'd3-time-format'
const parseTime = timeParse('%m/%d/%Y %I:%M%p') // 01/13/2020 5:30PM

export function toDT(d: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0')

    return `${toD(d)}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}Z`
}

export function toD(d: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0')

    return `${pad(d.getFullYear())}${pad(d.getMonth()+1)}${pad(d.getDate()+1)}`
}

export function generateRRULE(sec: AvailableSection): RRule {

    // writtenTime -> "MoWe 4:00PM-5:30PM"

    return new RRule({
        freq: RRule.WEEKLY,
        byweekday: [RRule.MO, RRule.FR],
        dtstart: new Date(sec.semesterStartDate!),
        until: new Date(sec.semesterEndDate!)
    })
}

export function generateICAL(sec: AvailableSection) {
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
${generateRRULE(sec).toString()}
DTSTART;TZID=America/Chicago:${toDT(parseTime(`${sec.semesterStartDate!} ${sec.meetingStartTime!}`)!)}
DTEND;TZID=America/Chicago:${toDT(parseTime(`${sec.semesterEndDate!} ${sec.meetingEndTime!}`)!)}
SUMMARY:${sec.subject} ${sec.catalogNumber} (${sec.instructor})[${sec.sectionIdentifier}]
LOCATION:${sec.location}
END:VEVENT
END:VCALENDAR
`
}
