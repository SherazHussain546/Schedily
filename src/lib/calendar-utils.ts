export type ItemType = 'meeting' | 'shift';

export interface Meeting {
  id: string;
  title: string;
  type: ItemType;
  employeeName?: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
}

/**
 * Formats a date and time into YYYYMMDDTHHMMSS format.
 */
function formatToICSDate(dateStr: string, timeStr: string): string {
  const date = dateStr.replace(/-/g, '');
  const time = timeStr.replace(/:/g, '') + '00';
  return `${date}T${time}`;
}

/**
 * Calculates the relative trigger duration for an alarm to occur the day before at 8:00 PM.
 * Returns a string in the format -PT{H}H{M}M.
 */
function getShiftAlarmTrigger(dateStr: string, startTimeStr: string): string {
  try {
    // Construct start date object
    const start = new Date(`${dateStr}T${startTimeStr}:00`);
    
    // Target is the day before at 20:00
    const target = new Date(start);
    target.setDate(target.getDate() - 1);
    target.setHours(20, 0, 0, 0);

    const diffMs = start.getTime() - target.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    // If the diff is negative or zero, trigger at event start as fallback
    if (diffMinutes <= 0) return '-PT0M';

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return `-PT${hours}H${minutes}M`;
  } catch (e) {
    return '-PT12H'; // Fallback to 12 hours before if date parsing fails
  }
}

/**
 * Generates the Vcalendar string from an array of meetings/shifts.
 */
export function generateICSContent(meetings: Meeting[]): string {
  const events = meetings.map((m) => {
    const start = formatToICSDate(m.date, m.startTime);
    const end = formatToICSDate(m.date, m.endTime);
    const created = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let summary = m.title || (m.type === 'shift' ? 'Retail Shift' : 'Untitled Meeting');
    if (m.type === 'shift' && m.employeeName) {
      summary = `${m.employeeName} - ${summary}`;
    }

    const description = m.type === 'shift' && m.employeeName ? `Employee: ${m.employeeName}` : '';
    
    let alarmBlock = '';
    if (m.type === 'shift') {
      const trigger = getShiftAlarmTrigger(m.date, m.startTime);
      alarmBlock = [
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Shift Preparation Reminder',
        `TRIGGER:${trigger}`,
        'END:VALARM'
      ].join('\r\n');
    }
    
    const eventLines = [
      'BEGIN:VEVENT',
      `UID:${m.id}`,
      `DTSTAMP:${created}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : '',
      `LOCATION:${m.location || ''}`,
    ];

    if (alarmBlock) {
      eventLines.push(alarmBlock);
    }

    eventLines.push('END:VEVENT');

    return eventLines.join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meeting Maestro//EN',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Triggers a download for the generated ICS content.
 */
export function downloadICS(content: string, filename: string = 'schedule.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
