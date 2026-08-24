function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(text: string): string {
  return text.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
}

interface CalendarEventInput {
  title: string;
  venueName: string;
  date: string;
  startTime: string;
  bookingRef: string;
  durationHours?: number;
}

/** Builds an .ics calendar file and triggers a browser download. */
export function downloadCalendarInvite({ title, venueName, date, startTime, bookingRef, durationHours = 2 }: CalendarEventInput) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const start = new Date(date);
  start.setHours(hours || 0, minutes || 0, 0, 0);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TicketHub//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${bookingRef}@tickethub`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICSText(title)}`,
    `LOCATION:${escapeICSText(venueName)}`,
    `DESCRIPTION:${escapeICSText(`Booking reference: ${bookingRef}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]/gi, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
