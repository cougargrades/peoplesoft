# PeopleSoft Row Format

|  Index |  PeopleSoft Name |  Example Value              |
|--------|------------------|-----------------------------|
|  0     | Class            | `"20846"`                   |
| 1      | Section          | `"01-LEC\nRegular"`         |
| 2      | Days & Times     | `"MoWe 4:00PM-5:30PM"`      |
| 3      | Room             | `"SEC 104"`                 |
| 4      | Instructor       | `"Kevin B Long"`            |
| 5      | CV               | `""`                        |
| 6      | Meeting Dates    | `"01/13/2020 - 05/06/2020"` |
| 7      | Location         | `"University of Houston"`   |
| 8      | Instruction Mode | `"Face to Face"`            |
| 9      | Syllabus         | `""`                        |
| 10     | Status           | `"Closed"`                  |
| 11     | Textbook List    | `""`                        |
| 12     | <empty>          | `"Select"`                  |

# `AvailableSections` model

```js
[
  AvailableSection {
    subject: 'COSC',
    catalogNumber: '3360',
    sectionIdentifier: '14366',
    sectionInfo: '01-LEC\nRegular',
    sectionNumber: '01',
    instructionType: 'LEC',
    sectionLimitation: 'Regular',
    meetingTimeWritten: 'MoWe 4:00PM - 5:30PM',
    meetingStartTime: '4:00PM',
    meetingEndTime: '5:30PM',
    meetingWeekdays: [ 'Mo', 'We' ],
    location: 'TBA',
    instructor: 'Jehan-Francois Paris',
    meetingDates: '01/19/2021 - 05/13/2021',
    semesterStartDate: '01/19/2021',
    semesterEndDate: '05/13/2021',
    campus: 'University of Houston',
    instructionMode: 'Synchronous Online',
    registrationStatus: 'Wait List',
    calendarFile: ''
  },
  AvailableSection {
    subject: 'COSC',
    catalogNumber: '3360',
    sectionIdentifier: '23473',
    sectionInfo: '02-LEC\nRegular',
    sectionNumber: '02',
    instructionType: 'LEC',
    sectionLimitation: 'Regular',
    meetingTimeWritten: 'TuTh 4:00PM - 5:30PM',
    meetingStartTime: '4:00PM',
    meetingEndTime: '5:30PM',
    meetingWeekdays: [ 'Tu', 'Th' ],
    location: 'TBA',
    instructor: 'Carlos Alberto Rincon',
    meetingDates: '01/19/2021 - 05/13/2021',
    semesterStartDate: '01/19/2021',
    semesterEndDate: '05/13/2021',
    campus: 'University of Houston',
    instructionMode: 'Synchronous Online',
    registrationStatus: 'Closed',
    calendarFile: ''
  }
]
```