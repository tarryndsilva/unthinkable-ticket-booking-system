import { posterGradient } from '../../lib/poster';
import { Badge } from './Badge';

interface TicketProps {
  eventTitle: string;
  venueName: string;
  date: string;
  time: string;
  seatLabels: string[];
  bookingRef: string;
  qrCodeData: string | null;
  status: 'CONFIRMED' | 'CANCELLED';
}

export function Ticket({ eventTitle, venueName, date, time, seatLabels, bookingRef, qrCodeData, status }: TicketProps) {
  return (
    <div className="flex w-full max-w-lg overflow-hidden rounded-2xl border border-canvas-700 shadow-[var(--shadow-float)]">
      {/* Poster stub */}
      <div className="relative flex w-28 shrink-0 flex-col justify-between p-4" style={posterGradient(eventTitle)}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Admit</p>
          <p className="font-display text-3xl italic text-white">{seatLabels.length}</p>
        </div>
      </div>

      {/* Perforation */}
      <div className="relative w-0 bg-canvas-900">
        <div
          className="absolute inset-y-0 left-0 w-px"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0 6px, rgba(148,147,184,0.5) 6px 12px)',
          }}
        />
        <div className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-canvas-950" />
        <div className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-canvas-950" />
      </div>

      {/* Details */}
      <div className="flex flex-1 items-center justify-between gap-4 bg-canvas-850 p-5">
        <div className="min-w-0">
          <div className="mb-1.5">
            <Badge tone={status === 'CONFIRMED' ? 'emerald' : 'neutral'} dot>
              {status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}
            </Badge>
          </div>
          <h4 className="truncate font-display text-lg italic text-canvas-50">{eventTitle}</h4>
          <p className="mt-0.5 truncate text-xs text-canvas-400">{venueName}</p>
          <p className="mt-0.5 text-xs text-canvas-400">
            {new Date(date).toDateString()} &middot; {time}
          </p>
          <p className="mt-2 text-xs text-canvas-300">
            Seats: <span className="font-medium text-canvas-100">{seatLabels.join(', ')}</span>
          </p>
          <p className="mt-1 font-mono text-[11px] tracking-wider text-canvas-500">{bookingRef}</p>
        </div>

        {qrCodeData && status === 'CONFIRMED' && (
          <div className="shrink-0 rounded-lg bg-white p-1.5 shadow-md">
            <img src={qrCodeData} alt="QR ticket" className="h-16 w-16" />
          </div>
        )}
      </div>
    </div>
  );
}
