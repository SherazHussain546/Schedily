
export interface Meeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
}

/**
 * Formats a date and time into YYYYMMDDTHHMMSS format.
 */
function formatToICSDate(dateStr: string, timeStr: string): string {
  // dateStr is typically YYYY-MM-DD
  // timeStr is typically HH:MM
  const date = dateStr.replace(/-/g, '');
  const time = timeStr.replace(/:/g, '') + '00';
  return `${date}T${time}`;
}

/**
 * Generates the Vcalendar string from an array of meetings.
 */
export function generateICSContent(meetings: Meeting[]): string {
  const events = meetings.map((m) => {
    const start = formatToICSDate(m.date, m.startTime);
    const end = formatToICSDate(m.date, m.endTime);
    const created = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    return [
      'BEGIN:VEVENT',
      `UID:${m.id}`,
      `DTSTAMP:${created}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${m.title || 'Untitled Meeting'}`,
      `LOCATION:${m.location || ''}`,
      'END:VEVENT'
    ].join('\r\n');
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
