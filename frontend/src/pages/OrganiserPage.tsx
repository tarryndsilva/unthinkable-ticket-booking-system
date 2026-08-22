import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import type { Venue, EventItem } from '../types';

export function OrganiserPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venueId, setVenueId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'MOVIE' | 'CONCERT'>('MOVIE');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [pricing, setPricing] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revenue, setRevenue] = useState<Record<string, any>>({});

  useEffect(() => {
    api.get('/api/venues').then((res) => setVenues(res.data));
    refreshEvents();
  }, []);

  function refreshEvents() {
    api.get('/api/events').then((res) => setEvents(res.data));
  }

  const selectedVenue = venues.find((v) => v.id === venueId);
  const categories = selectedVenue?.seats ? Array.from(new Set(selectedVenue.seats.map((s) => s.category))) : [];

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/api/events', {
        title,
        type,
        venueId,
        date: new Date(date).toISOString(),
        startTime,
        pricing: categories.map((c) => ({ category: c, price: Number(pricing[c] || 0) })),
      });
      setTitle('');
      setDate('');
      setPricing({});
      refreshEvents();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadRevenue(eventId: string) {
    const res = await api.get(`/api/events/${eventId}/revenue`);
    setRevenue((prev) => ({ ...prev, [eventId]: res.data }));
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Organiser Dashboard</h1>

      <div className="bg-white rounded-lg shadow border p-5 mb-8">
        <h2 className="font-semibold mb-3">Create a new event listing</h2>
        <form onSubmit={handleCreateEvent} className="space-y-3">
          <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="w-full border rounded px-3 py-2" required>
            <option value="">Select venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <input placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" required />
          <div className="flex gap-3">
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="border rounded px-3 py-2">
              <option value="MOVIE">Movie</option>
              <option value="CONCERT">Concert</option>
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2" required />
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="border rounded px-3 py-2" required />
          </div>
          {categories.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {categories.map((c) => (
                <div key={c}>
                  <label className="text-sm text-slate-600">{c} price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricing[c] || ''}
                    onChange={(e) => setPricing((p) => ({ ...p, [c]: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button disabled={busy || !venueId} className="bg-indigo-600 text-white px-5 py-2 rounded disabled:opacity-40">
            {busy ? 'Creating...' : 'Create event'}
          </button>
        </form>
      </div>

      <h2 className="text-xl font-bold mb-3">Your Events</h2>
      <div className="space-y-3">
        {events.map((ev) => (
          <div key={ev.id} className="bg-white rounded-lg shadow border p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{ev.title}</p>
                <p className="text-sm text-slate-600">{ev.venue?.name} · {new Date(ev.date).toDateString()}</p>
              </div>
              <button onClick={() => loadRevenue(ev.id)} className="text-sm text-indigo-600 hover:underline">
                View revenue
              </button>
            </div>
            {revenue[ev.id] && (
              <div className="mt-3 text-sm bg-slate-50 rounded p-3">
                <p>Total bookings: {revenue[ev.id].totalBookings}</p>
                <p>Seats sold: {revenue[ev.id].seatsSold}</p>
                <p className="font-semibold">Total revenue: ${revenue[ev.id].totalRevenue.toFixed(2)}</p>
                <div className="mt-1">
                  {Object.entries(revenue[ev.id].byCategory).map(([cat, v]: any) => (
                    <p key={cat} className="text-slate-600">
                      {cat}: {v.count} seats · ${v.revenue.toFixed(2)}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
