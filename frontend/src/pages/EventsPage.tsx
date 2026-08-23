import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { EventItem } from '../types';
import { Badge } from '../components/ui/Badge';
import { posterGradient } from '../lib/poster';

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

  const featured = events[0];
  const rest = type ? events : events.slice(1);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas-950">
      {/* ===== Hero ===== */}
      <div className="relative overflow-hidden border-b border-canvas-800">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-20 h-72 w-72 rounded-full bg-electric-500/15 blur-[100px]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pb-24 sm:pt-28">
          <Badge tone="brand" dot>
            Live seat availability, updated in real time
          </Badge>
          <h1 className="mt-5 max-w-2xl font-display text-5xl italic leading-[1.05] text-canvas-50 sm:text-6xl">
            Every seat,
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-electric-300 to-violet-300 bg-clip-text text-transparent">
              beautifully booked.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-canvas-300 sm:text-lg">
            Browse movies and concerts, pick your seat from a live theatre map, and get a ticket
            worth screenshotting.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-canvas-400">
            {type ? `${type === 'MOVIE' ? 'Movies' : 'Concerts'}` : 'What\u2019s on'}
          </h2>
          <div className="flex gap-1 rounded-full border border-canvas-700 bg-canvas-900 p-1">
            {[
              { v: '', label: 'All' },
              { v: 'MOVIE', label: 'Movies' },
              { v: 'CONCERT', label: 'Concerts' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setType(opt.v)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  type === opt.v ? 'bg-canvas-700 text-white shadow-sm' : 'text-canvas-400 hover:text-canvas-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-canvas-800" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="py-20 text-center text-canvas-400">No events found. Check back soon.</p>
        ) : (
          <>
            {!type && featured && (
              <Link
                to={`/events/${featured.id}`}
                className="group mb-10 block overflow-hidden rounded-3xl border border-canvas-700 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]"
              >
                <div
                  className="relative flex min-h-[280px] flex-col justify-end p-8 sm:min-h-[340px] sm:p-10"
                  style={posterGradient(featured.title)}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-canvas-950/90 via-canvas-950/20 to-transparent" />
                  <div className="relative">
                    <Badge tone="gold" dot>
                      Featured
                    </Badge>
                    <h3 className="mt-3 font-display text-3xl italic text-white sm:text-4xl">{featured.title}</h3>
                    <p className="mt-2 text-sm text-canvas-200">
                      {featured.venue?.name} &middot; {new Date(featured.date).toDateString()} &middot;{' '}
                      {featured.startTime}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {featured.pricing?.map((p) => (
                        <span
                          key={p.category}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white backdrop-blur"
                        >
                          {p.category} from ${Number(p.price).toFixed(0)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((ev, i) => (
                <Link
                  key={ev.id}
                  to={`/events/${ev.id}`}
                  className="group animate-[fade-up_0.5s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-2xl border border-canvas-700 bg-canvas-850 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1.5 hover:border-canvas-500 hover:shadow-[var(--shadow-card-hover)]"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden" style={posterGradient(ev.title)}>
                    <div className="absolute inset-0 bg-gradient-to-t from-canvas-900/80 via-transparent to-transparent transition-opacity duration-300 group-hover:from-canvas-900/60" />
                    <div className="absolute left-3 top-3">
                      <Badge tone={ev.type === 'MOVIE' ? 'brand' : 'violet'}>{ev.type}</Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-1 font-semibold text-canvas-50 transition-colors group-hover:text-brand-300">
                      {ev.title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-sm text-canvas-400">{ev.venue?.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-canvas-500">
                        {new Date(ev.date).toDateString()} &middot; {ev.startTime}
                      </p>
                      {ev.pricing?.[0] && (
                        <p className="text-sm font-semibold text-canvas-100">
                          ${Math.min(...ev.pricing.map((p) => Number(p.price))).toFixed(0)}+
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
