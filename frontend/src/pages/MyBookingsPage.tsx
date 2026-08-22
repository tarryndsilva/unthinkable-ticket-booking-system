import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import type { Booking, WaitlistEntry } from '../types';

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [error, setError] = useState('');

  function refresh() {
    api.get('/api/bookings').then((res) => setBookings(res.data));
    api.get('/api/bookings/waitlist/mine').then((res) => setWaitlist(res.data));
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
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="space-y-4">
        {bookings.length === 0 && <p className="text-slate-500">No bookings yet.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="bg-white rounded-lg shadow border p-4 flex gap-4">
            {b.qrCodeData && <img src={b.qrCodeData} alt="QR ticket" className="w-24 h-24" />}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold">{b.event.title}</h2>
                  <p className="text-sm text-slate-600">
                    {b.event.venue.name} · {new Date(b.event.date).toDateString()} · {b.event.startTime}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {b.status}
                </span>
              </div>
              <p className="text-sm mt-1">
                Ref: <span className="font-mono">{b.bookingRef}</span> · Seats:{' '}
                {b.seats.map((s) => s.showSeat.seat.label).join(', ')}
              </p>
              <p className="text-sm">Total: ${Number(b.totalAmount).toFixed(2)}</p>
              {b.status === 'CONFIRMED' && (
                <button onClick={() => handleCancel(b.id)} className="mt-2 text-sm text-red-600 hover:underline">
                  Cancel booking
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {waitlist.length > 0 && (
        <>
          <h2 className="text-xl font-bold mt-8 mb-3">My Waitlist</h2>
          <div className="space-y-3">
            {waitlist.map((w) => (
              <div key={w.id} className="bg-white rounded-lg shadow border p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{w.event.title}</p>
                    <p className="text-sm text-slate-600">{w.category} category</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      w.status === 'OFFERED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {w.status}
                  </span>
                </div>
                {w.status === 'OFFERED' && w.offerExpiresAt && (
                  <div className="mt-2">
                    <p className="text-xs text-amber-700">
                      A seat is available for you — complete checkout before{' '}
                      {new Date(w.offerExpiresAt).toLocaleTimeString()}
                    </p>
                    <button
                      onClick={() => handleCompleteOfferedBooking(w)}
                      className="mt-1 text-sm bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-500"
                    >
                      Complete booking now
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
