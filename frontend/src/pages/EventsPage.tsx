import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { EventItem } from '../types';

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [type, setType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/api/events', { params: type ? { type } : {} })
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Upcoming Events</h1>
        <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded px-3 py-2">
          <option value="">All types</option>
          <option value="MOVIE">Movies</option>
          <option value="CONCERT">Concerts</option>
        </select>
      </div>

      {loading ? (
        <p>Loading events...</p>
      ) : events.length === 0 ? (
        <p className="text-slate-500">No events found.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <Link
              key={ev.id}
              to={`/events/${ev.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition p-4 border"
            >
              <span className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">{ev.type}</span>
              <h2 className="text-lg font-semibold mt-1">{ev.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{ev.venue?.name}</p>
              <p className="text-sm text-slate-500">
                {new Date(ev.date).toDateString()} · {ev.startTime}
              </p>
              <div className="mt-2 flex gap-2 flex-wrap">
                {ev.pricing?.map((p) => (
                  <span key={p.category} className="text-xs bg-slate-100 rounded px-2 py-1">
                    {p.category}: ${Number(p.price).toFixed(2)}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
