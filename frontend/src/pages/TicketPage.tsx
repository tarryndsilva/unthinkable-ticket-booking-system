import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Booking } from '../types';
import { Ticket } from '../components/ui/Ticket';
import { Button } from '../components/ui/Button';
import { posterGradient } from '../lib/poster';

export function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/bookings/${id}`)
      .then((res) => setBooking(res.data))
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-canvas-950 px-6">
        <p className="text-canvas-400">Couldn&rsquo;t find that ticket.</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-canvas-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-canvas-700 border-t-brand-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-canvas-950 px-6 py-14">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={posterGradient(booking.event.title)} />
      <div className="pointer-events-none absolute inset-0 bg-canvas-950/70 backdrop-blur-3xl" />

      <div className="relative mx-auto max-w-lg">
        <Link to="/bookings" className="text-sm text-canvas-400 hover:text-canvas-200">
          &larr; Back to my tickets
        </Link>

        <div className="mt-6 flex flex-col items-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-canvas-400">Your ticket</p>
          <h1 className="mt-2 text-center font-display text-3xl italic text-canvas-50">{booking.event.title}</h1>

          <div className="mt-8 w-full">
            <Ticket
              eventTitle={booking.event.title}
              venueName={booking.event.venue.name}
              date={booking.event.date}
              time={booking.event.startTime}
              seatLabels={booking.seats.map((s) => s.showSeat.seat.label)}
              bookingRef={booking.bookingRef}
              qrCodeData={booking.qrCodeData}
              status={booking.status}
            />
          </div>

          <div className="mt-6 grid w-full grid-cols-2 gap-3 text-center text-sm">
            <div className="rounded-xl border border-canvas-700 bg-canvas-850/60 p-3">
              <p className="text-canvas-400">Total paid</p>
              <p className="mt-1 font-display text-lg italic text-canvas-50">${Number(booking.totalAmount).toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-canvas-700 bg-canvas-850/60 p-3">
              <p className="text-canvas-400">Booked on</p>
              <p className="mt-1 font-display text-lg italic text-canvas-50">
                {new Date(booking.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-canvas-500">
            Present the QR code at entry. Screenshot this page or check your email for a copy.
          </p>

          <Link to="/bookings" className="mt-6">
            <Button variant="secondary">Back to my tickets</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
