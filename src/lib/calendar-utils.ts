
export type ItemType = 'meeting' | 'shift';
export type MeetingStatus = 'pending' | 'accepted';

export interface Meeting {
  id: string;
  title: string;
  type: ItemType;
  status?: MeetingStatus;
  employeeName?: string;
  emails?: string;
  description?: string;
  attachments?: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  senderId?: string;
  senderName?: string;
}

/**
 * Formats a date and time into YYYYMMDDTHHMMSS format as required by the iCalendar spec.
 */
function formatToICSDate(dateStr: string, timeStr: string): string {
  const date = dateStr.replace(/-/g, '');
  const time = timeStr.replace(/:/g, '') + '00';
  return `${date}T${time}`;
}

/**
 * Generates a Google Calendar "Add Event" URL for a single meeting.
 */
export function generateGoogleCalendarUrl(m: Meeting): string {
  const start = formatToICSDate(m.date, m.startTime);
  const end = formatToICSDate(m.date, m.endTime);
  const details = encodeURIComponent(m.description || '');
  const location = encodeURIComponent(m.location || '');
  const text = encodeURIComponent(m.title || (m.type === 'shift' ? 'Retail Shift' : 'Meeting'));
  
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
}

/**
 * Generates the full string content for an iCalendar (.ics) file.
 * Includes VTIMEZONE for better "auto-add" compatibility.
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

    let descriptionParts = [];
    if (m.type === 'shift' && m.employeeName) descriptionParts.push(`Teammate: ${m.employeeName}`);
    if (m.description) descriptionParts.push(`Context: ${m.description}`);
    if (m.attachments) descriptionParts.push(`Docs: ${m.attachments}`);
    if (m.senderName) descriptionParts.push(`Dispatched by: ${m.senderName}`);
    
    const description = descriptionParts.join('\\n');
    
    const eventLines = [
      'BEGIN:VEVENT',
      `UID:${m.id}-${created}`,
      `DTSTAMP:${created}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : '',
      `LOCATION:${m.location || 'Remote/TBD'}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Coordination Reminder: ${summary}`,
      'TRIGGER:-PT1H', // 1 hour before
      'END:VALARM',
      'END:VEVENT'
    ];

    return eventLines.join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SchedilySocial//Coordination//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Triggers a browser download of the generated .ics file.
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
