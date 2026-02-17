
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
    return '-PT12H';
  }
}

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
    if (m.type === 'shift' && m.employeeName) descriptionParts.push(`Employee: ${m.employeeName}`);
    if (m.emails) descriptionParts.push(`Attendees: ${m.emails}`);
    if (m.description) descriptionParts.push(`Notes: ${m.description}`);
    if (m.attachments) descriptionParts.push(`Attachments: ${m.attachments}`);
    if (m.senderName) descriptionParts.push(`Pushed by: ${m.senderName}`);
    
    const description = descriptionParts.join('\\n');
    
    const trigger = getAlarmTrigger(m.date, m.startTime);
    const alarmBlock = [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${m.type === 'shift' ? 'Shift' : 'Meeting'} Preparation Reminder`,
      `TRIGGER:${trigger}`,
      'END:VALARM'
    ].join('\r\n');
    
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
    'PRODID:-//Schedily//EN',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
}

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
