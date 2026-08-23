import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import type { Booking, WaitlistEntry } from '../types';
import { Ticket } from '../components/ui/Ticket';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    Promise.all([api.get('/api/bookings'), api.get('/api/bookings/waitlist/mine')])
      .then(([b, w]) => {
        setBookings(b.data);
        setWaitlist(w.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleCancel(id: string) {
    if (!confirm('Cancel this booking? The seat will be offered to the next waitlisted customer.')) return;
    setError('');
    try {
      await api.delete(`/api/bookings/${id}`);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleCompleteOfferedBooking(w: WaitlistEntry) {
    if (!w.offeredSeatId) return;
    setError('');
    try {
      await api.post(`/api/events/${w.event.id}/bookings`, {
        seatIds: [w.offeredSeatId],
        sessionId: `waitlist-offer-${w.id}`,
      });
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas-950">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl italic text-canvas-50">My tickets</h1>
        <p className="mt-1 text-sm text-canvas-400">Your bookings and waitlist status, all in one place.</p>
        {error && <p className="mt-4 text-sm text-ruby-400">{error}</p>}

        {loading ? (
          <div className="mt-8 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-4">
              {bookings.length === 0 && (
                <Card variant="outline" className="p-8 text-center text-sm text-canvas-400">
                  No bookings yet &mdash; go find something to see.
                </Card>
              )}
              {bookings.map((b, i) => (
                <div
                  key={b.id}
                  className="animate-[fade-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Link to={`/bookings/${b.id}`} className="block transition-transform duration-200 hover:-translate-y-0.5">
                    <Ticket
                      eventTitle={b.event.title}
                      venueName={b.event.venue.name}
                      date={b.event.date}
                      time={b.event.startTime}
                      seatLabels={b.seats.map((s) => s.showSeat.seat.label)}
                      bookingRef={b.bookingRef}
                      qrCodeData={b.qrCodeData}
                      status={b.status}
                    />
                  </Link>
                  {b.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleCancel(b.id)}
                      className="mt-2 text-xs font-medium text-ruby-400 hover:text-ruby-300"
                    >
                      Cancel booking
                    </button>
                  )}
                </div>
              ))}
            </div>

            {waitlist.length > 0 && (
              <>
                <h2 className="mb-4 mt-12 font-display text-2xl italic text-canvas-50">Waitlist</h2>
                <div className="space-y-3">
                  {waitlist.map((w) => (
                    <Card key={w.id} variant="solid" className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-canvas-50">{w.event.title}</p>
                          <p className="text-sm text-canvas-400">{w.category} category</p>
                        </div>
                        <Badge tone={w.status === 'OFFERED' ? 'amber' : 'neutral'} dot>
                          {w.status}
                        </Badge>
                      </div>
                      {w.status === 'OFFERED' && w.offerExpiresAt && (
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                          <p className="text-xs text-amber-300">
                            A seat is yours &mdash; complete checkout by {new Date(w.offerExpiresAt).toLocaleTimeString()}
                          </p>
                          <Button variant="gold" size="sm" onClick={() => handleCompleteOfferedBooking(w)}>
                            Book now
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
