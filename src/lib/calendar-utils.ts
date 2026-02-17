
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
 * Calculates a relative trigger for a preparation alarm (set to 8:00 PM the evening before).
 * Returns a string in the standard iCalendar duration format.
 */
function getAlarmTrigger(dateStr: string, startTimeStr: string): string {
  try {
    const start = new Date(`${dateStr}T${startTimeStr}:00`);
    const target = new Date(start);
    target.setDate(target.getDate() - 1);
    target.setHours(20, 0, 0, 0);

    const diffMs = start.getTime() - target.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes <= 0) return '-PT0M';

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return `-PT${hours}H${minutes}M`;
  } catch (e) {
    return '-PT12H'; // Fallback to 12 hours before
  }
}

/**
 * Generates the full string content for an iCalendar (.ics) file.
 */
export function generateICSContent(meetings: Meeting[]): string {
  const events = meetings.map((m) => {
    const start = formatToICSDate(m.date, m.startTime);
    const end = formatToICSDate(m.date, m.endTime);
    const created = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    // Create a social-friendly summary
    let summary = m.title || (m.type === 'shift' ? 'Retail Shift' : 'Untitled Meeting');
    if (m.type === 'shift' && m.employeeName) {
      summary = `${m.employeeName} - ${summary}`;
    }

    // Build the descriptive context for the calendar entry
    let descriptionParts = [];
    if (m.type === 'shift' && m.employeeName) descriptionParts.push(`Teammate: ${m.employeeName}`);
    if (m.emails) descriptionParts.push(`List: ${m.emails}`);
    if (m.description) descriptionParts.push(`Context: ${m.description}`);
    if (m.attachments) descriptionParts.push(`Docs: ${m.attachments}`);
    if (m.senderName) descriptionParts.push(`Dispatched by: ${m.senderName}`);
    
    const description = descriptionParts.join('\\n');
    
    // Add a preparation alarm
    const trigger = getAlarmTrigger(m.date, m.startTime);
    const alarmBlock = [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Coordination Reminder: ${summary}`,
      `TRIGGER:${trigger}`,
      'END:VALARM'
    ].join('\r\n');
    
    const eventLines = [
      'BEGIN:VEVENT',
      `UID:${m.id}-${created}`,
      `DTSTAMP:${created}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : '',
      `LOCATION:${m.location || 'Remote/TBD'}`,
    ];

    // Handle attendees if emails are available
    if (m.emails) {
      const emailList = m.emails.split(',').map(e => e.trim());
      emailList.forEach(email => {
        if (email) {
          eventLines.push(`ATTENDEE;CN=${email}:mailto:${email}`);
        }
      });
    }

    eventLines.push(alarmBlock);
    eventLines.push('END:VEVENT');

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
