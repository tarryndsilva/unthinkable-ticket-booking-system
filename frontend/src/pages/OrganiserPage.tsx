import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import type { Venue, EventItem, OrganiserBooking, SeatMapEntry } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MiniBarChart, StatCard } from '../components/ui/Chart';
import { OccupancyBar } from '../components/ui/OccupancyBar';
import { SkeletonCard } from '../components/ui/Skeleton';

const CATEGORY_COLORS = ['#7c7fff', '#f7c65b', '#34e0a1', '#5ec8ff', '#b388ff'];
type Tab = 'revenue' | 'occupancy' | 'bookings';

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
  const [showForm, setShowForm] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('revenue');
  const [revenue, setRevenue] = useState<Record<string, any>>({});
  const [bookings, setBookings] = useState<Record<string, OrganiserBooking[]>>({});
  const [seatMaps, setSeatMaps] = useState<Record<string, SeatMapEntry[]>>({});

  useEffect(() => {
    api.get('/api/venues').then((res) => setVenues(res.data));
    refreshEvents();
  }, []);

  function refreshEvents() {
    setEventsLoading(true);
    api
      .get('/api/events')
      .then((res) => setEvents(res.data))
      .finally(() => setEventsLoading(false));
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
      setShowForm(false);
      refreshEvents();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEvent(eventId: string) {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
      return;
    }
    setExpandedEvent(eventId);
    setActiveTab('revenue');
    loadPanelData(eventId, 'revenue');
  }

  async function loadPanelData(eventId: string, tab: Tab) {
    setActiveTab(tab);
    if (tab === 'revenue' && !revenue[eventId]) {
      const res = await api.get(`/api/events/${eventId}/revenue`);
      setRevenue((prev) => ({ ...prev, [eventId]: res.data }));
    }
    if (tab === 'occupancy' && !seatMaps[eventId]) {
      const res = await api.get(`/api/events/${eventId}/seatmap`);
      setSeatMaps((prev) => ({ ...prev, [eventId]: res.data }));
    }
    if (tab === 'bookings' && !bookings[eventId]) {
      const res = await api.get(`/api/events/${eventId}/bookings`);
      setBookings((prev) => ({ ...prev, [eventId]: res.data }));
    }
  }

  async function handleCancelBooking(eventId: string, bookingId: string) {
    if (!confirm('Cancel this booking on the customer\u2019s behalf? The seat will be offered to the waitlist.')) return;
    try {
      await api.delete(`/api/events/${eventId}/bookings/${bookingId}`);
      const res = await api.get(`/api/events/${eventId}/bookings`);
      setBookings((prev) => ({ ...prev, [eventId]: res.data }));
      // occupancy/revenue may now be stale — refetch on next view
      setSeatMaps((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      setRevenue((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  const totalRevenueAllTime = Object.values(revenue).reduce((sum: number, r: any) => sum + (r.totalRevenue || 0), 0);
  const totalSeatsAllTime = Object.values(revenue).reduce((sum: number, r: any) => sum + (r.seatsSold || 0), 0);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas-950">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl italic text-canvas-50">Organiser dashboard</h1>
            <p className="mt-1 text-sm text-canvas-400">Manage listings and track how they're performing.</p>
          </div>
          <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : '+ New event'}
          </Button>
        </div>

        {Object.keys(revenue).length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Tracked revenue" value={`$${totalRevenueAllTime.toFixed(0)}`} tone="emerald" />
            <StatCard label="Seats sold" value={String(totalSeatsAllTime)} tone="brand" />
            <StatCard label="Live listings" value={String(events.length)} tone="gold" />
          </div>
        )}

        {showForm && (
          <Card variant="glass" glow="brand" className="mb-8 animate-[fade-up_0.3s_ease-out] p-6">
            <h2 className="mb-4 font-semibold text-canvas-100">Create a new event listing</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-canvas-200">Venue</label>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full rounded-xl border border-canvas-600 bg-canvas-850 px-4 py-2.5 text-sm text-canvas-50 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                  required
                >
                  <option value="">Select venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Event title" placeholder="e.g. Midnight Jazz Sessions" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-canvas-200">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-xl border border-canvas-600 bg-canvas-850 px-3 py-2.5 text-sm text-canvas-50 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                  >
                    <option value="MOVIE">Movie</option>
                    <option value="CONCERT">Concert</option>
                  </select>
                </div>
                <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} required />
                <Input type="time" label="Start time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              {categories.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((c) => (
                    <Input
                      key={c}
                      label={`${c} price ($)`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing[c] || ''}
                      onChange={(e) => setPricing((p) => ({ ...p, [c]: e.target.value }))}
                      required
                    />
                  ))}
                </div>
              )}
              {error && <p className="text-sm text-ruby-400">{error}</p>}
              <Button type="submit" variant="primary" loading={busy} disabled={!venueId}>
                Create event
              </Button>
            </form>
          </Card>
        )}

        <h2 className="mb-4 font-semibold text-canvas-100">Your events</h2>
        {eventsLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const isOpen = expandedEvent === ev.id;
            const map = seatMaps[ev.id];
            const occCounts = map
              ? {
                  available: map.filter((s) => s.status === 'AVAILABLE').length,
                  held: map.filter((s) => s.status === 'HELD').length,
                  booked: map.filter((s) => s.status === 'BOOKED').length,
                }
              : null;

            return (
              <Card key={ev.id} variant="solid" className="overflow-hidden p-0">
                <button onClick={() => toggleEvent(ev.id)} className="flex w-full items-center justify-between p-5 text-left">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-canvas-50">{ev.title}</p>
                      <Badge tone={ev.type === 'MOVIE' ? 'brand' : 'violet'}>{ev.type}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-canvas-400">
                      {ev.venue?.name} &middot; {new Date(ev.date).toDateString()}
                    </p>
                  </div>
                  <span className={`text-canvas-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    &#9660;
                  </span>
                </button>

                {isOpen && (
                  <div className="animate-[fade-up_0.25s_ease-out] border-t border-canvas-700 p-5">
                    <div className="mb-4 flex gap-1 rounded-full border border-canvas-700 bg-canvas-900 p-1 w-fit">
                      {(['revenue', 'occupancy', 'bookings'] as Tab[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => loadPanelData(ev.id, t)}
                          className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-all ${
                            activeTab === t ? 'bg-canvas-700 text-white' : 'text-canvas-400 hover:text-canvas-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {activeTab === 'revenue' &&
                      (revenue[ev.id] ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 text-sm">
                            <p className="text-canvas-300">
                              Bookings: <span className="font-medium text-canvas-50">{revenue[ev.id].totalBookings}</span>
                            </p>
                            <p className="text-canvas-300">
                              Seats sold: <span className="font-medium text-canvas-50">{revenue[ev.id].seatsSold}</span>
                            </p>
                            <p className="text-canvas-300">
                              Total revenue:{' '}
                              <span className="font-display text-lg italic text-emerald-400">
                                ${revenue[ev.id].totalRevenue.toFixed(2)}
                              </span>
                            </p>
                          </div>
                          <MiniBarChart
                            data={Object.entries(revenue[ev.id].byCategory).map(([cat, v]: any, i) => ({
                              label: `${cat} (${v.count})`,
                              value: v.revenue,
                              color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                            }))}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-canvas-400">Loading&hellip;</p>
                      ))}

                    {activeTab === 'occupancy' &&
                      (occCounts ? (
                        <OccupancyBar {...occCounts} />
                      ) : (
                        <p className="text-sm text-canvas-400">Loading&hellip;</p>
                      ))}

                    {activeTab === 'bookings' &&
                      (bookings[ev.id] ? (
                        bookings[ev.id].length === 0 ? (
                          <p className="text-sm text-canvas-400">No bookings yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {bookings[ev.id].map((b) => (
                              <div
                                key={b.id}
                                className="flex items-center justify-between rounded-xl border border-canvas-700 bg-canvas-900/50 p-3"
                              >
                                <div>
                                  <p className="text-sm font-medium text-canvas-100">{b.customer.name}</p>
                                  <p className="text-xs text-canvas-400">
                                    {b.customer.email} &middot; {b.seats.map((s) => s.showSeat.seat.label).join(', ')} &middot; $
                                    {Number(b.totalAmount).toFixed(2)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge tone={b.status === 'CONFIRMED' ? 'emerald' : 'neutral'}>{b.status}</Badge>
                                  {b.status === 'CONFIRMED' && (
                                    <button
                                      onClick={() => handleCancelBooking(ev.id, b.id)}
                                      className="text-xs font-medium text-ruby-400 hover:text-ruby-300"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <p className="text-sm text-canvas-400">Loading&hellip;</p>
                      ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
